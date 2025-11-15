// ...existing code...
import React from "react";
import Sidebar from "@/components/sidebar/Sidebar";
import Header from "@/components/header/Header";
import "./globals.css";

export const metadata = {
  title: "Employee Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {/* left column: fixed width */}
          <div
            style={{
              width: 240,
              flex: "0 0 240px",
              position: "sticky" /* make sidebar stick */,
              top: 0,
              alignSelf: "flex-start",
              height: "100vh",
              zIndex: 1000,
            }}
          >
            <Sidebar />
          </div>

          {/* right column: header + page content */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <Header />
            <main style={{ padding: 20, paddingTop: 10, flex: 1 }}>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

