import { Link } from 'wouter';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-6" />
        <h1 className="text-4xl font-bold mb-3">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
