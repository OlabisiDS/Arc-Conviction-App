import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/300-italic.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "./globals.css";

export const metadata = {
  title: "Arc conviction card",
  description: "How consistent and conviction-driven is your Arc presence?"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
