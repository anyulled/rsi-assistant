export function Exercises() {
  const exercises = [
    { title: "Wrist Rolls", description: "Gently roll your wrists in circles for 10 seconds." },
    { title: "Neck Stretch", description: "Tilt your head to the side, hold for 15s, switch." },
    { title: "Shoulder Shrugs", description: "Lift shoulders to ears, release. Repeat 5 times." },
    {
      title: "Palming",
      description: "Rub hands together to warm them, then place over closed eyes.",
    },
    {
      title: "Distant Gaze",
      description: "Look at something 20 feet away for 20 seconds (20-20-20 rule).",
    },
  ];

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded shadow-md">
      <h2 className="text-xl font-semibold mb-4">Quick Exercises</h2>
      <div className="space-y-4">
        {exercises.map((ex, i) => (
          <div key={i} className="border-b border-gray-200 dark:border-gray-700 pb-2 last:border-0">
            <h3 className="font-bold text-blue-600 dark:text-blue-400">{ex.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{ex.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
