import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignedDataVerifier, Environment, Type, InAppOwnershipType } from '@apple/app-store-server-library';
import { subscriptionVerifier, InvalidPurchase } from './verification.mjs';
import { createVerifierServer, loadSettings } from './server.mjs';
const config={bundleId:'example.fixture',environment:Environment.PRODUCTION,appAppleId:123,productIds:['com.thinknoise.blobular.cloud.monthly']};
const token='aa71b495-6dcb-423f-8916-0deef17542e9';
function fixture() {
  const now=Date.now();
  const tx={originalTransactionId:'100',transactionId:'101',appAccountToken:token,bundleId:config.bundleId,
    environment:config.environment,productId:'com.thinknoise.blobular.cloud.monthly',type:Type.AUTO_RENEWABLE_SUBSCRIPTION,
    inAppOwnershipType:InAppOwnershipType.PURCHASED,expiresDate:now+3600000,signedDate:now};
  const renewal={originalTransactionId:'100',productId:tx.productId,environment:config.environment,signedDate:now,autoRenewStatus:1};
  const item={originalTransactionId:'100',status:1,signedTransactionInfo:'signed-tx',signedRenewalInfo:'signed-renewal'};
  const response={bundleId:config.bundleId,environment:config.environment,appAppleId:123,data:[{lastTransactions:[item]}]};
  const client={async getTransactionInfo(){return {signedTransactionInfo:'signed-tx'};},async getAllSubscriptionStatuses(){return response;}};
  const verifier={async verifyAndDecodeTransaction(){return tx;},async verifyAndDecodeRenewalInfo(){return renewal;},
    async verifyAndDecodeNotification(){return {data:{signedTransactionInfo:'signed-tx'}};}};
  return {tx,renewal,item,response,client,verifier,service:subscriptionVerifier(client,verifier,config)};
}
test('current subscription, cancellation, expiry, grace, refund and renewal',async()=>{
  const f=fixture(); assert.equal((await f.service.transaction('101',token))[0].status,'active');
  f.renewal.autoRenewStatus=0;
  const cancelled=(await f.service.transaction('101',token))[0];
  assert.equal(cancelled.willRenew,false); assert.equal(cancelled.status,'active');
  f.item.status=2; assert.equal((await f.service.transaction('101',token))[0].status,'expired');
  f.item.status=4; f.renewal.gracePeriodExpiresDate=Date.now()+100000;
  assert.equal((await f.service.transaction('101',token))[0].expiresAt,Math.floor(f.renewal.gracePeriodExpiresDate/1000));
  f.item.status=1; f.tx.revocationDate=Date.now()-10;
  assert.equal((await f.service.notification('fixture-notification'))[0].status,'revoked');
  delete f.tx.revocationDate; f.tx.transactionId='102';
  assert.equal((await f.service.transaction('102',token))[0].transactionId,'102');
});
test('replayed notifications fetch current Apple state',async()=>{
  const f=fixture(); let calls=0; f.client.getAllSubscriptionStatuses=async()=>{calls++;return f.response;}; f.item.status=5;
  assert.equal((await f.service.notification('old-signed-notification'))[0].status,'revoked'); assert.equal(calls,1);
});
test('reject wrong identity, product, environment, ownership and renewal',async()=>{
  for(const [key,value] of Object.entries({appAccountToken:'ff71b495-6dcb-423f-8916-0deef17542e9',bundleId:'wrong',
    environment:'Sandbox',productId:'wrong',type:'Consumable',inAppOwnershipType:'FAMILY_SHARED',signedDate:Date.now()+900000})) {
    const f=fixture(); f.tx[key]=value; await assert.rejects(f.service.transaction('101',token),InvalidPurchase);
  }
  for(const [key,value] of Object.entries({originalTransactionId:'999',environment:'Sandbox',productId:'wrong',autoRenewStatus:3})) {
    const f=fixture(); f.renewal[key]=value; await assert.rejects(f.service.transaction('101',token),InvalidPurchase);
  }
  const f=fixture(); f.response.appAppleId=456; await assert.rejects(f.service.transaction('101',token),InvalidPurchase);
});
test('official SDK rejects unsigned and forged signed data',async()=>{
  const sdk=new SignedDataVerifier([],true,Environment.PRODUCTION,config.bundleId,config.appAppleId);
  for(const value of ['not-a-jws','eyJhbGciOiJub25lIn0.eyJhY3RpdmUiOnRydWV9.','eyJhbGciOiJFUzI1NiJ9.e30.Zm9yZ2Vk']) {
    await assert.rejects(sdk.verifyAndDecodeTransaction(value)); await assert.rejects(sdk.verifyAndDecodeNotification(value));
  }
});
test('missing deployment settings fail closed',()=>assert.throws(()=>loadSettings({})));
test('private HTTP API requires secret and rejects client entitlement flags',async()=>{
  const f=fixture(); const secret='fixture-only-secret-with-at-least-32-characters';
  const server=createVerifierServer(f.service,secret); await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const url=`http://127.0.0.1:${server.address().port}/transaction`;
    const request=(body,auth=true)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${secret}`}:{})},body:JSON.stringify(body)});
    assert.equal((await request({},false)).status,401); assert.equal((await request({isSubscriber:true})).status,400);
    const response=await request({transactionId:'101',appAccountToken:token});
    assert.equal(response.status,200); assert.equal((await response.json()).verified,true);
    assert.equal((await request({transactionId:'101',appAccountToken:'wrong'})).status,400);
  } finally {await new Promise(resolve=>server.close(resolve));}
});
