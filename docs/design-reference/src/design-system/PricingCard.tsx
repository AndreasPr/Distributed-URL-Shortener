import React from 'react';
import { Check } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';

export interface PricingCardProps {
  name: string;
  tagline: string;
  audience: string;
  price: number;
  interval?: 'month' | 'year';
  features: string[];
  isPopular?: boolean;
  ctaText?: string;
  onSelect?: () => void;
  className?: string;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  name,
  tagline,
  audience,
  price,
  interval = 'month',
  features,
  isPopular = false,
  ctaText = 'Select Plan',
  onSelect,
  className = '',
}) => {
  return (
    <Card
      className={`relative p-6 flex flex-col justify-between ${
        isPopular
          ? 'border-blue-600/60 dark:border-blue-500/60 ring-1 ring-blue-600/30'
          : 'border-slate-200 dark:border-white/10'
      } ${className}`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-6">
          <Badge variant="default" size="sm" className="shadow-xs">
            Most Popular
          </Badge>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{name}</h3>
        </div>

        <p className="mt-1 text-xs text-blue-700 dark:text-blue-400 font-medium">{audience}</p>

        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed min-h-[36px]">
          {tagline}
        </p>

        {/* Price Block */}
        <div className="mt-5 pb-5 border-b border-slate-100 dark:border-white/5 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            ${price}
          </span>
          <span className="text-xs text-slate-600 dark:text-slate-400">/{interval}</span>
        </div>

        {/* Feature List */}
        <div className="mt-5 space-y-2.5">
          <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Included Capabilities
          </p>
          <ul className="space-y-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <span className="leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 pt-4">
        <Button
          variant={isPopular ? 'primary' : 'outline'}
          onClick={onSelect}
          className="w-full text-xs"
        >
          {ctaText}
        </Button>
      </div>
    </Card>
  );
};
