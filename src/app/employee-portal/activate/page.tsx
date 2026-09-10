import { Suspense } from "react";
import ActivateEmployee from "./ActivateEmployee";
export default function ActivateEmployeePage() { return <Suspense fallback={<div>Loading secure activation…</div>}><ActivateEmployee /></Suspense>; }
