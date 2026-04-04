import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import sky from "../assets/sky.jpg";

export default function Home() {

  const navigate = useNavigate();

  function goToSignup() {
    navigate("/signup");
  }

  return (
    <div
      onClick={goToSignup}
      className="relative h-screen w-full overflow-hidden flex items-center justify-center cursor-pointer"
    >

      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${sky})` }}
      ></div>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="relative z-10 text-center"
      >

        <h1 className="text-6xl font-bold text-white mb-6">
          GenZ Circle
        </h1>

        <p className="text-gray-300 text-lg">
          Find your tribe in the digital galaxy
        </p>

        <motion.p
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="mt-10 text-indigo-400"
        >
          Click anywhere to start →
        </motion.p>

      </motion.div>

    </div>
  );
}