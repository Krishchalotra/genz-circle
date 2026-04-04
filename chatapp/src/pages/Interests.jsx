import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import sky from "../assets/sky.jpg";

export default function Interests() {

  const navigate = useNavigate();

  const [selected, setSelected] = useState([]);
  const [customInterest, setCustomInterest] = useState("");

  const interests = [
    "Programming",
    "Robotics",
    "Aeronautics",
    "Photography",
    "Gaming",
    "Artificial Intelligence"
  ];

  // Select / deselect interests
  function toggleInterest(interest) {

    if (selected.includes(interest)) {
      setSelected(selected.filter(item => item !== interest));
    }

    else if (selected.length < 3) {
      setSelected([...selected, interest]);
    }

  }

  // Add custom interest
  function addCustomInterest() {

    const cleaned = customInterest.trim();

    if (
      cleaned !== "" &&
      !selected.includes(cleaned) &&
      selected.length < 3
    ) {
      setSelected([...selected, cleaned]);
      setCustomInterest("");
    }

  }

  // Continue to groups page
  function handleSubmit() {

    console.log("Selected Interests:", selected);

    navigate("/groups");

  }

  return (

    <div
      className="h-screen w-full bg-cover bg-center flex items-center justify-center text-white px-6"
      style={{ backgroundImage: `url(${sky})` }}
    >

      {/* Dark overlay */}

      <div className="absolute inset-0 bg-black/60"></div>


      {/* Glass Container */}

      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 p-10 rounded-2xl w-[720px] text-center shadow-2xl">

        {/* Title */}

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-3"
        >
          Select Your Interests
        </motion.h1>

        <p className="text-gray-300 mb-8">
          Choose up to 3 interests
        </p>


        {/* Interests Grid */}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">

          {interests.map((interest) => (

            <motion.button
              key={interest}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleInterest(interest)}
              className={`p-4 rounded-xl border transition-all

              ${
                selected.includes(interest)
                  ? "bg-indigo-600 border-indigo-400"
                  : "bg-white/10 border-white/20 hover:bg-white/20"
              }

              `}
            >

              {interest}

            </motion.button>

          ))}

        </div>


        {/* Custom Interest */}

        <div className="flex justify-center gap-3 mb-6">

          <input
            type="text"
            placeholder="Add custom interest"
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            className="bg-white/10 border border-white/20 p-3 rounded-lg outline-none text-white placeholder-gray-300 w-60"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addCustomInterest}
            className="bg-indigo-600 px-4 rounded-lg hover:bg-indigo-700"
          >
            Add
          </motion.button>

        </div>


        {/* Selected Interests */}

        {selected.length > 0 && (

          <div className="mb-6 text-sm text-gray-300">

            Selected: {selected.join(", ")}

          </div>

        )}


        {/* Continue Button */}

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          className="bg-indigo-600 px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
        >

          Continue

        </motion.button>

      </div>

    </div>

  );

}