export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          OpenClaw Dashboard
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          SAP-4: Project scaffolding complete
        </p>
        <div className="flex gap-4 justify-center">
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium">
            ✓ Next.js App Router
          </div>
          <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md font-medium">
            ✓ Tailwind CSS
          </div>
          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
            ⏳ NextAuth setup
          </div>
          <div className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-md font-medium">
            ⏳ BFF proxy
          </div>
        </div>
      </div>
    </div>
  );
}
