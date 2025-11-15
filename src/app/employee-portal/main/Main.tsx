"use client";
import React from "react";

export default function Main({ children }: { children: React.ReactNode }) {
  // keep this as a client wrapper only
  return <>{children}</>;
}