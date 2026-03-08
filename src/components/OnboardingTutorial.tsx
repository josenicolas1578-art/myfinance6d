import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Target, Sparkles, ArrowRight } from "lucide-react";
import logoImg from "@/assets/logo.png";

interface OnboardingTutorialProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: null, // logo
    title: "Bem-vindo ao My Finance!",
    description: "Seu assistente financeiro inteligente. Vamos te mostrar como tudo funciona.",
  },
  {
    icon: Target,
    title: "Nosso foco",
    description: "Te ajudar a organizar suas finanças, controlar gastos e alcançar seus objetivos de forma simples e prática.",
  },
  {
    icon: MessageCircle,
    title: "Chats inteligentes",
    description: "Converse com nossa IA sobre Gastos, Investimentos e Retornos. Cada chat é especializado pra te ajudar no que você precisa.",
  },
  {
    icon: Sparkles,
    title: "Tudo personalizado",
    description: "Preencha seu perfil financeiro e receba orientações feitas sob medida pra sua realidade.",
  },
];

const OnboardingTutorial = ({ onComplete }: OnboardingTutorialProps) => {
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6 bg-background/90 backdrop-blur-md">
      <div className="relative bg-card border border-border rounded-2xl p-8 w-full max-w-xs shadow-lg shadow-primary/10 animate-fade-in">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : "w-1.5 bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-4">
          {step === 0 ? (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary/40 neon-glow flex items-center justify-center bg-background">
              <img src={logoImg} alt="My Finance" className="w-10 h-10 object-contain" />
            </div>
          ) : current.icon ? (
            <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <current.icon className="w-7 h-7 text-primary" />
            </div>
          ) : null}

          <div className="space-y-2">
            <h2 className="text-lg font-heading font-bold text-foreground">{current.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              className="flex-1 h-10 text-sm"
            >
              Voltar
            </Button>
          )}
          <Button
            onClick={() => {
              if (isLast) {
                onComplete();
              } else {
                setStep(step + 1);
              }
            }}
            className="flex-1 h-10 bg-primary text-primary-foreground hover:bg-primary/90 neon-glow font-semibold text-sm"
          >
            {isLast ? "Começar!" : (
              <>
                Próximo
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTutorial;
