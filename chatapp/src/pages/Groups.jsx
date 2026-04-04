import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import sky from "../assets/sky.jpg";
import { useEffect } from "react";
import axios from "axios";

export default function Groups() {

 const [groups, setGroups] = useState([]);

  const [newGroup, setNewGroup] = useState("");
   const navigate = useNavigate();

  useEffect(() => {
  fetchGroups();
}, []);

async function addGroup() {
  const cleaned = newGroup.trim();
  if (!cleaned) return;

  const user = JSON.parse(localStorage.getItem("user")) || {};

  try {
    await axios.post("http://localhost:5000/api/groups/create", {
      name: cleaned,
      interest: "General",
      userId: user.id,
    });

    setNewGroup("");
    fetchGroups();
  } catch (err) {
    console.log(err);
  }
}

async function fetchGroups() {
  try {
    const res = await axios.get("http://localhost:5000/api/groups");
    setGroups(res.data);
  } catch (err) {
    console.log(err);
  }
}

function enterGroup(group) {

  console.log("Entering group:", group);

  // store selected group
  localStorage.setItem("currentGroup", JSON.stringify(group));

  // navigate to chat
  navigate("/app/chat");

}

  return (

    <div
      className="h-screen w-full bg-cover bg-center flex items-center justify-center text-white px-6"
      style={{ backgroundImage: `url(${sky})` }}
    >

      {/* dark overlay */}

      <div className="absolute inset-0 bg-black/60"></div>


      {/* glass container */}

      <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20 p-10 rounded-2xl w-[720px] text-center shadow-2xl">

        {/* title */}

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold mb-4"
        >
          Communities
        </motion.h1>

        <p className="text-gray-300 mb-8">
          Join a group or create your own
        </p>


        {/* group cards */}

        <div className="grid grid-cols-2 gap-4 mb-8">

{groups.map((group) => (

  <motion.button
    key={group._id}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => enterGroup(group)}
    className="p-4 rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 transition-all"
  >

    {group.name}

  </motion.button>

))}

        </div>


        {/* create group */}

        <div className="flex justify-center gap-3 mb-4">

          <input
            type="text"
            placeholder="Create new group"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value)}
            className="bg-white/10 border border-white/20 p-3 rounded-lg outline-none text-white placeholder-gray-300 w-60"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={addGroup}
            className="bg-indigo-600 px-4 rounded-lg hover:bg-indigo-700"
          >
            Create
          </motion.button>

        </div>

      </div>

    </div>

  );

}