import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-[radial-gradient(circle_at_top_left,#eef0fb_0%,#f3f4f8_35%,#f3f4f8_100%)]">
        <Header />
        <main className="p-6 md:p-8 max-w-[1600px]">{children}</main>
      </div>
    </div>
  );
}
