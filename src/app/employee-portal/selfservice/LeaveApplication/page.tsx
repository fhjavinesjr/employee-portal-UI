"use client";

import React from "react";
import Main from "@/app/employee-portal/main/Main";
import LeaveApplication from "./LeaveApplication";

export default function LeaveApplicationPage() {
  return (
    <Main>
      <LeaveApplication onClose={() => {}} />
    </Main>
  );
}
