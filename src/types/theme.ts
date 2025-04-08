import 'styled-components';

declare module 'styled-components' {
  export interface DefaultTheme {
    // Background colors
    background: string;
    card: string;
    input: string;
    modal: string;
    
    // Text colors
    text: string;
    secondaryText: string;
    placeholder: string;
    
    // UI colors
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
    danger: string;
    dangerHover: string;
    success: string;
    successHover: string;
    
    // Border colors
    border: string;
    borderHover: string;
    
    // Focus states
    focus: string;
    focusRing: string;
    
    // Status colors
    online: string;
    offline: string;
    
    // Shadows
    shadow: string;
    shadowHover: string;
  }
} 