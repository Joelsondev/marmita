export interface CartItemOption {
  optionId: string;
  optionName: string;
  price: number;
}

export interface CartItem {
  mealId: string;
  mealName: string;
  quantity: number;
  unitPrice: number;
  options: CartItemOption[];
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem('cart');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem('cart', JSON.stringify(items));
}

export function addToCart(item: CartItem) {
  const cart = getCart();
  cart.push(item);
  saveCart(cart);
}

export function updateCartItem(index: number, quantity: number) {
  const cart = getCart();
  if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index].quantity = quantity;
  }
  saveCart(cart);
}

export function clearCart() {
  localStorage.removeItem('cart');
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    const optionsTotal = item.options.reduce((s, o) => s + o.price, 0);
    return sum + (item.unitPrice + optionsTotal) * item.quantity;
  }, 0);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
