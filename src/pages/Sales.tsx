import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../shared/types';
import { generateReceipt } from '../utils/pdfGenerator';
import {
  MagnifyingGlassIcon,
  ShoppingCartIcon,
  XMarkIcon,
  CheckIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

const Sales: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await window.electronAPI.products.getAll();
      setProducts(data.filter((p: Product) => p.is_active && p.stock_quantity > 0));
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await window.electronAPI.products.search(query);
      setProducts(results.filter((p: Product) => p.is_active && p.stock_quantity > 0));
    } else {
      loadProducts();
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock_quantity) {
        setCart(cart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        alert('Not enough stock available');
      }
    } else {
      setCart([...cart, { product, quantity: 1, discount: 0 }]);
    }
  };

  const updateQuantity = (productId: number, quantity: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (quantity > item.product.stock_quantity) {
      alert('Not enough stock available');
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId ? { ...item, quantity } : item
    ));
  };

  const updateItemDiscount = (productId: number, discount: number) => {
    setCart(cart.map(item =>
      item.product.id === productId ? { ...item, discount: Math.max(0, discount) } : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setTax(0);
    setNotes('');
    setPaymentMethod('cash');
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity - item.discount);
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal - discount + tax;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!user) {
      alert('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        discount: item.discount,
      }));

      const result = await window.electronAPI.sales.create(
        user.id,
        items,
        paymentMethod,
        discount,
        tax,
        notes
      );

      if (result.success) {
        setLastSaleId(result.sale?.id || null);
        setShowSuccess(true);
        clearCart();
        loadProducts(); // Refresh stock

        setTimeout(() => {
          setShowSuccess(false);
        }, 3000);
      } else {
        alert(result.message || 'Sale failed');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrintReceipt = () => {
    if (!lastSaleId || !user) return;

    const receiptData = {
      saleId: lastSaleId,
      date: new Date().toLocaleString(),
      cashier: user.full_name,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity - item.discount,
      })),
      subtotal: calculateSubtotal(),
      discount: discount,
      tax: tax,
      total: calculateTotal(),
      paymentMethod: paymentMethod,
      notes: notes,
    };

    generateReceipt(receiptData);
  };

  return (
  return (
    <div className="h-full flex gap-6">
      {/* Left Panel - Products */}
      <div className="flex-1 flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">Point of Sale</h1>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or barcode..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <ShoppingCartIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-800 truncate" title={product.name}>
                  {product.name}
                </h3>
                <p className="text-sm text-gray-500 mb-2">{product.sku}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-600">
                    ${product.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-gray-500">
                    Stock: {product.stock_quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCartIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No products found</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white rounded-lg shadow-lg p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Cart</h2>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto mb-6">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCartIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Cart is empty</p>
              <p className="text-sm mt-2">Add products to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.product.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">{item.product.name}</h3>
                      <p className="text-sm text-gray-500">${item.product.price.toFixed(2)} each</p>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 bg-white rounded border border-gray-300 hover:bg-gray-100"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                      className="w-16 text-center border border-gray-300 rounded py-1"
                      min="1"
                      max={item.product.stock_quantity}
                    />
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-8 h-8 bg-white rounded border border-gray-300 hover:bg-gray-100"
                    >
                      +
                    </button>
                    <input
                      type="number"
                      value={item.discount}
                      onChange={(e) => updateItemDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                      placeholder="Discount"
                      className="flex-1 text-right border border-gray-300 rounded py-1 px-2 text-sm"
                      step="0.01"
                    />
                  </div>

                  <div className="text-right font-semibold text-gray-800">
                    ${(item.product.price * item.quantity - item.discount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Payment */}
        {cart.length > 0 && (
          <>
            <div className="border-t pt-4 space-y-3 mb-4">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>${calculateSubtotal().toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Discount:</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 text-right border border-gray-300 rounded py-1 px-2"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tax:</span>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 text-right border border-gray-300 rounded py-1 px-2"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t">
                <span>Total:</span>
                <span>${calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'card', 'mobile'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as any)}
                    className={`py-2 px-3 rounded-lg font-medium capitalize transition-colors ${
                      paymentMethod === method
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm"
      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Sale Complete!</h3>
            <p className="text-gray-600 mb-6">Transaction successful</p>
            <button
              onClick={handlePrintReceipt}
              className="flex items-center gap-2 mx-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              <PrinterIcon className="w-5 h-5" />
              Print Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};              <>
                  <CheckIcon className="w-5 h-5" />
                  Complete Sale
                </>
              )}
            </button>
          </>
        )}
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-sm text-center animate-bounce">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Sale Complete!</h3>
            <p className="text-gray-600">Transaction successful</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
