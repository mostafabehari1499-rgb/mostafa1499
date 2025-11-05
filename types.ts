
export type FontStyle = 'font-inter' | 'font-lora' | 'font-roboto-mono';
export type Alignment = 'left' | 'center' | 'right';
export type Mode = 'day' | 'night';
export type Direction = 'ltr' | 'rtl';

export interface PromptSettings {
  speed: number;
  fontSize: number;
  fontStyle: FontStyle;
  alignment: Alignment;
  mode: Mode;
  direction: Direction;
}

export interface Prompt {
  id: string;
  title: string;
  text: string;
  settings: PromptSettings;
  startTime?: number;
  endTime?: number;
  createdAt: number;
}
