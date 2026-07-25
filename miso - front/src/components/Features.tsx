import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Cpu, FileCheck, Shield, Zap, FileText } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  index: number;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, index, icon }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: "easeOut" }}
      className="relative flex flex-col justify-start select-none py-2"
    >
      <div className="w-10 h-10 rounded-lg border border-white/10 bg-[#0A0A0A] flex items-center justify-center text-white mb-5">
        {icon}
      </div>

      <h3 className="text-lg font-bold tracking-tight text-white mb-2">
        {title}
      </h3>
      
      <p className="text-neutral-400 text-sm leading-relaxed max-w-sm">
        {description}
      </p>
    </motion.div>
  );
}

export default function Features() {
  const featuresList = [
    {
      title: 'Smart Discovery',
      description: 'Automatically detects and maps all Solana programs within your monorepo, analyzing their entry points and dependencies.',
      icon: <Eye className="w-5 h-5 text-white" />
    },
    {
      title: 'AI Security Audit',
      description: 'Combines heuristic static code analysis with deep LLM security reasoning to identify complex Solana-specific vulnerabilities.',
      icon: <Cpu className="w-5 h-5 text-white" />
    },
    {
      title: 'Evidence Verification',
      description: 'Every reported vulnerability is backed with static call stacks or dynamic proof-of-concept assertions to minimize noise.',
      icon: <FileCheck className="w-5 h-5 text-white" />
    },
    {
      title: 'Policy Engine',
      description: 'Configure customizable deployment policies. Automatically block deployments that violate critical security standards.',
      icon: <Shield className="w-5 h-5 text-white" />
    },
    {
      title: 'One Command Deploy',
      description: 'Runs checks locally or in CI/CD pipelines. Deploys seamlessly to Devnet, Testnet, or Mainnet once security gates clear.',
      icon: <Zap className="w-5 h-5 text-white" />
    },
    {
      title: 'Audit Reports',
      description: 'Generate high-quality audit summaries in Markdown, interactive HTML, or machine-readable JSON formats for stakeholders.',
      icon: <FileText className="w-5 h-5 text-white" />
    }
  ];

  return (
    <section id="features" className="py-24 relative bg-[#000000] border-b border-white/5">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/1 rounded-full blur-[160px] pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Heading */}
        <div className="max-w-3xl mb-20">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
            Engineered for <br/>
            High-Performance Security.
          </h2>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed">
            MISO provides developer-first security tools that sit seamlessly between development and deployment.
            No colorful gradients, just pure, reliable, robust infrastructure verification.
          </p>
        </div>

        {/* Features 3D Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              index={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
