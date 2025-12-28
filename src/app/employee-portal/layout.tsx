import "./globals.css";
import LayoutClientWrapper from "./layoutClientWrapper";
import PageAuthentication from "@/app/employee-portal/PageAuthentication";

export const metadata = {
  title: "Employee Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PageAuthentication>
          <LayoutClientWrapper>
            {children}
          </LayoutClientWrapper>
        </PageAuthentication>
      </body>
    </html>
  );
}
