// src/components/layout/PageShell.jsx
import Navbar from './Navbar';

const PageShell = ({ children, hideNav = false, fullBleed = false }) => (
  <div className="min-h-screen flex flex-col">
    {!hideNav && <Navbar />}
    <main className={fullBleed ? 'flex-1' : 'flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10'}>
      {children}
    </main>
  </div>
);

export default PageShell;
