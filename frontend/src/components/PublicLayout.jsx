import { Outlet } from 'react-router-dom';
import BackToTop from './BackToTop.jsx';
import Footer from './Footer.jsx';
import Navbar from './Navbar.jsx';
import PublicAiChatWidget from './PublicAiChatWidget.jsx';

export default function PublicLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="public-main">
        <div className="public-page-frame">
          <Outlet />
        </div>
      </main>
      <PublicAiChatWidget />
      <BackToTop />
      <Footer />
    </div>
  );
}
