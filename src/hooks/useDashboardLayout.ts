import { useState, useEffect, useCallback } from 'react';

export interface DashboardCard {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  size: 'small' | 'medium' | 'large';
}

const DEFAULT_CARDS: DashboardCard[] = [
  { id: 'distribuicao-status', title: 'Distribuição por Status', visible: true, order: 0, size: 'medium' },
  { id: 'top-produtores', title: 'Top Produtores', visible: true, order: 1, size: 'medium' },
  { id: 'tendencia', title: 'Tendência de Cotações', visible: true, order: 2, size: 'medium' },
  { id: 'top-seguradoras', title: 'Top 5 Seguradoras', visible: true, order: 3, size: 'medium' },
  { id: 'cotacoes-aberto-tipo', title: 'Cotações em Aberto', visible: true, order: 4, size: 'small' },
  { id: 'fechamentos-segmento', title: 'Fechamentos por Segmento', visible: true, order: 5, size: 'small' },
  { id: 'declinados-segmento', title: 'Declinados por Segmento', visible: true, order: 6, size: 'small' },
  { id: 'distribuicao-atual', title: 'Distribuição Atual', visible: true, order: 7, size: 'small' },
  { id: 'top-produtores-resumo', title: 'Top Produtores (Resumo)', visible: true, order: 8, size: 'small' },
  { id: 'performance-unidade', title: 'Performance por Unidade', visible: true, order: 9, size: 'small' },
];

const STORAGE_KEY = 'dashboard_layout';

export function useDashboardLayout(isAdmin: boolean) {
  const [cards, setCards] = useState<DashboardCard[]>(DEFAULT_CARDS);
  const [editMode, setEditMode] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);

  // Load layout from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to handle new cards
        const merged = DEFAULT_CARDS.map(defaultCard => {
          const savedCard = parsed.find((c: DashboardCard) => c.id === defaultCard.id);
          return savedCard ? { ...defaultCard, ...savedCard } : defaultCard;
        });
        setCards(merged);
      }
    } catch (error) {
      // Use defaults on error
      setCards(DEFAULT_CARDS);
    }
  }, []);

  // Save layout to localStorage
  const saveLayout = useCallback((newCards: DashboardCard[]) => {
    setCards(newCards);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newCards));
  }, []);

  // Toggle card visibility
  const toggleCardVisibility = useCallback((cardId: string) => {
    const newCards = cards.map(card =>
      card.id === cardId ? { ...card, visible: !card.visible } : card
    );
    saveLayout(newCards);
  }, [cards, saveLayout]);

  // Change card size
  const changeCardSize = useCallback((cardId: string, size: 'small' | 'medium' | 'large') => {
    const newCards = cards.map(card =>
      card.id === cardId ? { ...card, size } : card
    );
    saveLayout(newCards);
  }, [cards, saveLayout]);

  // Move card (reorder)
  const moveCard = useCallback((fromIndex: number, toIndex: number) => {
    const visibleCards = [...cards].filter(c => c.visible).sort((a, b) => a.order - b.order);
    const [movedCard] = visibleCards.splice(fromIndex, 1);
    visibleCards.splice(toIndex, 0, movedCard);
    
    // Update orders
    const newCards = cards.map(card => {
      const visibleIndex = visibleCards.findIndex(vc => vc.id === card.id);
      if (visibleIndex !== -1) {
        return { ...card, order: visibleIndex };
      }
      return card;
    });
    
    saveLayout(newCards);
  }, [cards, saveLayout]);

  // Reset to defaults
  const resetLayout = useCallback(() => {
    saveLayout(DEFAULT_CARDS);
  }, [saveLayout]);

  // Get visible cards sorted by order
  const visibleCards = cards
    .filter(card => card.visible)
    .sort((a, b) => a.order - b.order);

  // Check if a card is visible
  const isCardVisible = useCallback((cardId: string) => {
    return cards.find(c => c.id === cardId)?.visible ?? true;
  }, [cards]);

  // Get card size
  const getCardSize = useCallback((cardId: string) => {
    return cards.find(c => c.id === cardId)?.size ?? 'medium';
  }, [cards]);

  return {
    cards,
    visibleCards,
    editMode: isAdmin ? editMode : false,
    setEditMode: isAdmin ? setEditMode : () => {},
    toggleCardVisibility: isAdmin ? toggleCardVisibility : () => {},
    changeCardSize: isAdmin ? changeCardSize : () => {},
    moveCard: isAdmin ? moveCard : () => {},
    resetLayout: isAdmin ? resetLayout : () => {},
    isCardVisible,
    getCardSize,
    draggedCard,
    setDraggedCard: isAdmin ? setDraggedCard : () => {},
    canEdit: isAdmin,
  };
}
