import { useEffect, useRef, useState } from 'react';
import styles from '../styles/Home.module.css';
export default function TechStack() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.3,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      className={`${styles.textContainer} mt-12 transition-all duration-700 ${
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
      }`}
    >
      <div className={`${styles.gradentBlock} py-8 text-white`}>
        <div className="w-full flex flex-col items-center">
          <h2 className={`font-bold text-4xl mb-4 transition-all duration-700 delay-100 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            My Tech Stack
          </h2>
          <div className={`w-2/3 border-b-2 border-white mb-6 transition-all duration-700 delay-150 ${
            isVisible ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
          }`}></div>
          
          {/* Languages Section */}
          <div className={`w-full max-w-4xl mb-8 transition-all duration-700 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h3 className="font-light text-xl mb-4 text-center text-gray-300">
              Languages
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {["C++", "Go", "C", "Python", "TypeScript", "Java", "C#"].map(
                (lang, index) => (
                  <span
                    key={lang}
                    className={`px-4 py-2 bg-[#1e1e1e] rounded-lg border border-gray-700 hover:border-gray-500 transition-all font-light text-lg ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                    style={{ transitionDelay: `${300 + index * 50}ms` }}
                  >
                    {lang}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Skills Section */}
          <div className={`w-full max-w-4xl transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <h3 className="font-light text-xl mb-4 text-center text-gray-300">
              Skills
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "Full Stack Development",
                "API Development",
                "WebSockets",
                "Robotics (ROS)",
                "Database Design",
                "Docker",
                "Real-time Systems",
              ].map((tech, index) => (
                <span
                  key={tech}
                  className={`px-4 py-2 bg-[#1e1e1e] rounded-lg border border-gray-700 hover:border-gray-500 transition-all font-light text-lg ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${500 + index * 50}ms` }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}