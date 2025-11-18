import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const messages = [
  "Take a deep breath... 🍃",
  "You're doing great! ✨",
  "One step at a time... 🌸",
  "Peace is found within 🧘",
  "Stay mindful, stay present 🌿",
];

export const ZenCharacter = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const messageInterval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 8000);

    return () => clearInterval(messageInterval);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-8 right-8 z-50"
        >
          <div className="relative">
            {/* Message bubble */}
            <motion.div
              key={currentMessage}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute bottom-full mb-4 right-0 bg-card border-2 border-primary/20 rounded-2xl px-4 py-2 shadow-lg backdrop-blur-sm whitespace-nowrap"
            >
              <p className="text-sm text-foreground font-medium">{messages[currentMessage]}</p>
              <div className="absolute bottom-0 right-8 transform translate-y-1/2 rotate-45 w-3 h-3 bg-card border-r-2 border-b-2 border-primary/20"></div>
            </motion.div>

            {/* Character */}
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative cursor-pointer"
              onClick={() => setIsVisible(false)}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zen-sage to-zen-bamboo shadow-2xl flex items-center justify-center border-4 border-background">
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="text-5xl"
                >
                  🧘
                </motion.div>
              </div>
              
              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl -z-10 animate-pulse"></div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};