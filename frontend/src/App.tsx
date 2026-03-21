/**
 * Root App component rendering the landing splash screen.
 */
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-root">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-text-primary">
          Learner Verse
        </h1>
        <p className="mt-3 text-base text-text-secondary">
          Your personal learning management system
        </p>
      </div>
    </div>
  );
}

export default App;
