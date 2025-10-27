import Image from "next/image";
import styles from "../styles/Home.module.css";
import { useEffect, useRef, useState, createContext, useContext, ReactNode } from "react";

const ScrollContext = createContext<{
  observer: IntersectionObserver | null;
  visibleElements: Set<Element>
}>({ observer: null, visibleElements: new Set() });

export function ScrollObserverProvider({ children }: { children: ReactNode }) {
  const [visibleElements, setVisibleElements] = useState(new Set<Element>());
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // Create observer synchronously on first render (client-side only)
  if (typeof window !== 'undefined' && !observerRef.current) {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleElements((prev) => {
          const next = new Set(prev);
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              next.add(entry.target);
            } else {
              next.delete(entry.target);
            }
          });
          return next;
        });
      },
      { threshold: 0.1 } // Lower threshold triggers earlier
    );
  }

  useEffect(() => {
    // Cleanup only
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  return (
    <ScrollContext.Provider value={{ observer: observerRef.current, visibleElements }}>
      {children}
    </ScrollContext.Provider>
  );
}

interface PopInBlockProps {
  children: ReactNode;
  delay?: number;
}

export function PopInBlock({ children, delay = 0 }: PopInBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const { observer, visibleElements } = useContext(ScrollContext);
  const isVisible = visibleElements.has(blockRef.current as Element);

  useEffect(() => {
    const element = blockRef.current;
    if (observer && element) {
      observer.observe(element);
      return () => observer.unobserve(element);
    }
  }, [observer]);

  return (
    <div
      ref={blockRef}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}