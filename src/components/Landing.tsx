import { motion } from "framer-motion";
import { Play, Calendar, Music, Disc3, Headphones, Radio } from "lucide-react";

interface Props {
  onPlay: () => void;
  onDaily: () => void;
}

const NOTES = [
  { Icon: Music, x: "10%", y: "18%", size: 30, delay: 0 },
  { Icon: Disc3, x: "82%", y: "22%", size: 40, delay: 0.6 },
  { Icon: Headphones, x: "16%", y: "72%", size: 34, delay: 1.1 },
  { Icon: Radio, x: "86%", y: "70%", size: 30, delay: 1.6 },
  { Icon: Music, x: "70%", y: "12%", size: 22, delay: 0.9 },
];

export function Landing({ onPlay, onDaily }: Props) {
  return (
    <div className="landing">
      {NOTES.map(({ Icon, x, y, size, delay }, i) => (
        <motion.div
          key={i}
          className="landing-note"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0.5, 0.3, 0.5], y: [-8, 8, -8] }}
          transition={{ duration: 6, delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Icon size={size} />
        </motion.div>
      ))}

      <motion.div
        className="landing-hero"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <motion.h1
          className="landing-logo"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 16 }}
        >
          <span className="echo">Echo</span>Fan
        </motion.h1>
        <p className="landing-tagline">
          Adivina la canción por fragmentos.<br />
          Artista, género, idioma o el reto del día.
        </p>
        <motion.div
          className="landing-cta"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <button className="big" onClick={onPlay}>
            <Play size={18} fill="currentColor" /> Jugar
          </button>
          <button className="big landing-daily" onClick={onDaily}>
            <Calendar size={18} /> Reto diario
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
