import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, NativeScrollEvent, NativeSyntheticEvent, ScrollViewInstance, TextInputInstance } from 'react-native';

// Centraliza o ajuste de rolagem usado nos formulários quando o teclado cobre um campo.
export function useKeyboardForm(): {
  scrollRef: RefObject<ScrollViewInstance | null>;
  keyboardHeight: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onFieldFocus: (field: RefObject<TextInputInstance | null>) => void;
  onContentSizeChange: () => void;
} {
  // Refs guardam medidas transitórias sem renderizar a tela a cada movimento.
  const scrollRef = useRef<ScrollViewInstance>(null);
  const focusedField = useRef<RefObject<TextInputInstance | null> | null>(null);
  const scrollOffset = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Compara a posição do campo com a área visível e rola apenas o necessário.
  const revealFocusedField = useCallback((): void => {
    const field = focusedField.current?.current;
    const scroll = scrollRef.current;
    if (!field || !scroll) return;
    scroll.measureInWindow((_scrollX, scrollY, _scrollWidth, scrollHeight): void => {
      field.measureInWindow((_fieldX, fieldY, _fieldWidth, fieldHeight): void => {
        const visibleBottom = Math.min(scrollY + scrollHeight, keyboardTop.current ?? Number.POSITIVE_INFINITY);
        const below = fieldY + fieldHeight + 24 - visibleBottom;
        const above = fieldY - scrollY - 16;
        const delta = below > 0 ? below : above < 0 ? above : 0;
        if (delta !== 0) scroll.scrollTo({ y: Math.max(0, scrollOffset.current + delta), animated: true });
      });
    });
  }, []);

  // Os listeners acompanham a altura real do teclado e são removidos ao sair da tela.
  useEffect((): (() => void) => {
    const show = Keyboard.addListener('keyboardDidShow', (event): void => {
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame((): void => { requestAnimationFrame(revealFocusedField); });
    });
    const hide = Keyboard.addListener('keyboardDidHide', (): void => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    });
    return (): void => { show.remove(); hide.remove(); };
  }, [revealFocusedField]);

  // Lembra a rolagem manual para calcular a próxima posição sem saltos.
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    scrollOffset.current = event.nativeEvent.contentOffset.y;
  };

  // Guarda o campo ativo para recalcular a posição após a animação do teclado.
  const onFieldFocus = (field: RefObject<TextInputInstance | null>): void => {
    focusedField.current = field;
    requestAnimationFrame(revealFocusedField);
  };

  // Recalcula depois que mensagens de erro ou campos maiores mudam a altura do formulário.
  const onContentSizeChange = (): void => {
    if (keyboardTop.current !== null) requestAnimationFrame(revealFocusedField);
  };

  return { scrollRef, keyboardHeight, onScroll, onFieldFocus, onContentSizeChange };
}
