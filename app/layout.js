import "./globals.css";

export const metadata = {
  title: "24/9 Carwashing — CleanCar",
  description: "Doorstep car wash subscriptions and one-time washes.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="max-w-[460px] mx-auto min-h-screen bg-[#F3F6F8] shadow-lg relative">
          {children}
        </div>
      </body>
    </html>
  );
}
