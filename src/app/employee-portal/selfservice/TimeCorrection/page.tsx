"use client";

import React from "react";
import Main from "@/app/employee-portal/main/Main";
import TimeCorrection from "./TimeCorrection";

export default function TimeCorrectionPage() {
  return (
    <Main>
      <TimeCorrection onClose={() => {}} />
    </Main>
  );
}
