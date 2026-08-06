import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, type CartItem, type Merchandise } from '@/lib/supabase'
import { useAuthStore } from './authStore'

interface CartState {
  items: CartItem[]
  isLoading: boolean
  fetchCart: () => Promise<void>
  addItem: (merchandiseId: string, quantity?: number, size?: string, color?: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  clearCart: () => Promise<void>
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      fetchCart: async () => {
        const user = useAuthStore.getState().user
        if (!user) {
          set({ items: [] })
          return
        }

        set({ isLoading: true })

        try {
          const { data, error } = await supabase
            .from('cart_items')
            .select('*, merchandise(*)')
            .eq('user_id', user.id)

          if (error) throw error

          set({ items: data || [] })
        } catch (error) {
          console.error('Error fetching cart:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      addItem: async (merchandiseId, quantity = 1, size = null, color = null) => {
        const user = useAuthStore.getState().user
        if (!user) return

        try {
          const { data: existingItem } = await supabase
            .from('cart_items')
            .select('*')
            .eq('user_id', user.id)
            .eq('merchandise_id', merchandiseId)
            .eq('size', size)
            .eq('color', color)
            .single()

          if (existingItem) {
            const { error } = await supabase
              .from('cart_items')
              .update({ quantity: existingItem.quantity + quantity })
              .eq('id', existingItem.id)

            if (error) throw error
          } else {
            const { error } = await supabase.from('cart_items').insert({
              user_id: user.id,
              merchandise_id: merchandiseId,
              quantity,
              size,
              color,
            })

            if (error) throw error
          }

          await get().fetchCart()
        } catch (error) {
          console.error('Error adding item to cart:', error)
          throw error
        }
      },

      updateQuantity: async (itemId, quantity) => {
        try {
          if (quantity <= 0) {
            await get().removeItem(itemId)
            return
          }

          const { error } = await supabase
            .from('cart_items')
            .update({ quantity })
            .eq('id', itemId)

          if (error) throw error

          set((state) => ({
            items: state.items.map((item) =>
              item.id === itemId ? { ...item, quantity } : item
            ),
          }))
        } catch (error) {
          console.error('Error updating cart item:', error)
          throw error
        }
      },

      removeItem: async (itemId) => {
        try {
          const { error } = await supabase.from('cart_items').delete().eq('id', itemId)

          if (error) throw error

          set((state) => ({
            items: state.items.filter((item) => item.id !== itemId),
          }))
        } catch (error) {
          console.error('Error removing cart item:', error)
          throw error
        }
      },

      clearCart: async () => {
        const user = useAuthStore.getState().user
        if (!user) return

        try {
          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('user_id', user.id)

          if (error) throw error

          set({ items: [] })
        } catch (error) {
          console.error('Error clearing cart:', error)
          throw error
        }
      },

      getTotal: () => {
        return get().items.reduce((total, item) => {
          const merchandise = item.merchandise as Merchandise
          return total + (merchandise?.price || 0) * item.quantity
        }, 0)
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'zedvevo-cart',
    }
  )
)
