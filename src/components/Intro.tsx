import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function Intro({ onComplete }: { onComplete: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0d0d0d]"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="text-center"
          >
            <motion.img 
              src="https://i.postimg.cc/k4Wszn56/Chat-GPT-Image-26-de-mai-de-2026-13-03-24.png" 
              alt="Logo" 
              className="w-72 h-auto mx-auto mb-8"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            />
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="text-white text-5xl font-black tracking-tight"
            >
              <span className="text-blue-500">PH BET</span>: O SEU JOGO, A SUA SORTE.
            </motion.h1>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="text-gray-300 text-lg mt-4 font-light"
            >
              PREPARE-SE PARA VENCER AGORA.
            </motion.p>
            <motion.div 
               className="h-1 bg-gradient-to-r from-blue-600 to-emerald-400 mt-8 mx-auto"
               initial={{ width: 0, opacity: 0 }}
               animate={{ width: "300px", opacity: 1 }}
               transition={{ delay: 2, duration: 3, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
