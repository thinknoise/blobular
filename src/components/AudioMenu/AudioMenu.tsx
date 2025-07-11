import { useState } from "react";
import AudioRecordMenu from "./AudioRecordMenu";
import AudioPondMenu from "./AudioPondMenu";

export default function AudioMenu() {
  const [recordMenuOpen, setRecordMenuOpen] = useState(false);
  const [pondMenuOpen, setPondMenuOpen] = useState(false);

  const togglePondMenu = () => {
    setPondMenuOpen(!pondMenuOpen);
    if (!pondMenuOpen) {
      setRecordMenuOpen(true);
    }
  };

  const toggleRecordMenu = () => {
    if (recordMenuOpen && pondMenuOpen) {
      setPondMenuOpen(false);
    } else {
      setRecordMenuOpen(!recordMenuOpen);
    }
  };

  return (
    <div>
      <AudioPondMenu
        toggleMenu={togglePondMenu}
        isOpen={pondMenuOpen}
        closeThisMenu={() => setPondMenuOpen(false)}
      />
      <AudioRecordMenu
        toggleMenu={toggleRecordMenu}
        isOpen={recordMenuOpen}
        setPondMenuOpen={() => setPondMenuOpen(true)}
      />
    </div>
  );
}
