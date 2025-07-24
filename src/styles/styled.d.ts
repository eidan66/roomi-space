import 'styled-components';

export interface Theme {
  colors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
    accent: string;
    surface: string;
    border: string;
  };
  fontFamily: string;
  direction: 'ltr' | 'rtl';
}

declare module 'styled-components' {
  export type DefaultTheme = Theme;
}
