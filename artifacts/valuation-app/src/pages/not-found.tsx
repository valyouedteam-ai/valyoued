import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-6 px-4">
      <div className="text-[12rem] font-sans font-bold text-muted/30 leading-none">404</div>
      <h2 className="text-2xl font-sans">Asset Not Found</h2>
      <p className="text-muted-foreground max-w-md">
        The page or report you are looking for has been moved, deleted, or never existed in the ledger.
      </p>
      <Link href="/">
        <Button size="lg" className="mt-4">Return to Terminal</Button>
      </Link>
    </div>
  );
}
