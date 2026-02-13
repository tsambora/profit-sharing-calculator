import "./globals.css";

export const metadata = {
  title: "Profit Sharing Simulator",
  description: "Simulate profit sharing distributions across lenders and borrowers",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
