export default function AcademyLayout({ children }: { children: React.ReactNode }) {
  // The Academy uses a presentation-style look: deeper background, blue/orange accent lines.
  return (
    <div className="relative -mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:-my-8 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--info)/0.08),transparent_55%),radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.06),transparent_50%)]" />
      {children}
    </div>
  );
}
