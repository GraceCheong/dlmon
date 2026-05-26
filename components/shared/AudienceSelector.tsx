'use client';

export const AUDIENCES = [
  { value: 'middle_school', ko: '중학교', en: 'Middle School' },
  { value: 'high_school', ko: '고등학교', en: 'High School' },
  { value: 'university', ko: '대학교', en: 'University' },
  { value: 'adult', ko: '성인 일반', en: 'Adult / General' },
  { value: 'travel', ko: '여행', en: 'Travel' },
  { value: 'business', ko: '비즈니스', en: 'Business' },
] as const;

export type AudienceValue = (typeof AUDIENCES)[number]['value'];

interface Props {
  value: string;
  onChange: (v: string) => void;
  language?: 'ko' | 'en';
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function AudienceSelector({ value, onChange, language = 'ko', disabled, style }: Props) {
  return (
    <select
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={style}
    >
      <option value="">{language === 'ko' ? '대상 수준 선택' : 'Select audience'}</option>
      {AUDIENCES.map((a) => (
        <option key={a.value} value={a.value}>
          {language === 'ko' ? a.ko : a.en}
        </option>
      ))}
    </select>
  );
}

export function audienceLabel(value: string, language: 'ko' | 'en' = 'ko'): string {
  const found = AUDIENCES.find((a) => a.value === value);
  if (!found) return value;
  return language === 'ko' ? found.ko : found.en;
}
