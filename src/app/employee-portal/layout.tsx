import "./globals.css";
import LayoutClientWrapper from "./layoutClientWrapper";
export const metadata = {
  title: "Employee Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutClientWrapper>
          {children}
        </LayoutClientWrapper>
      </body>
    </html>
  );
}
