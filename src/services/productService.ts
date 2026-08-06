// Product Service - Admin marketplace management
import { supabase, isConfigured } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

class ProductService {
  // Create product (admin only)
  async createProduct(productData: {
    title: string
    description?: string
    category: string
    images: File[]
    price: number
    stock: number
    sizes?: string[]
    colors?: string[]
  }): Promise<{ success: boolean; error?: string; productId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Check admin
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { success: false, error: 'Only admins can create products' }
    }

    try {
      const productId = crypto.randomUUID()

      // Upload images
      const imageUrls: string[] = []
      for (const image of productData.images) {
        const path = `products/${productId}/${image.name}`
        const { error: uploadError } = await supabase.storage
          .from('products')
          .upload(path, image)

        if (!uploadError) {
          const { data } = supabase.storage.from('products').getPublicUrl(path)
          imageUrls.push(data.publicUrl)
        }
      }

      // Create product record
      const { error } = await supabase.from('merchandise').insert({
        id: productId,
        title: productData.title,
        description: productData.description,
        category: productData.category,
        images: imageUrls,
        price: productData.price,
        stock: productData.stock,
        sizes: productData.sizes,
        colors: productData.colors,
        created_at: new Date().toISOString(),
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, productId }
    } catch (error: any) {
      console.error('Product creation error:', error)
      return { success: false, error: error.message }
    }
  }

  // Update product (admin only)
  async updateProduct(
    productId: string,
    updates: {
      title?: string
      description?: string
      category?: string
      price?: number
      stock?: number
      sizes?: string[]
      colors?: string[]
      images?: string[]
    }
  ): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { success: false, error: 'Only admins can update products' }
    }

    try {
      const { error } = await supabase
        .from('merchandise')
        .update(updates)
        .eq('id', productId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Delete product (admin only)
  async deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return { success: false, error: 'Only admins can delete products' }
    }

    try {
      // Delete images from storage
      const { data: product } = await supabase
        .from('merchandise')
        .select('images')
        .eq('id', productId)
        .single()

      if (product?.images) {
        for (const imageUrl of product.images) {
          const path = imageUrl.split('/products/')[1]
          if (path) {
            await supabase.storage.from('products').remove([path])
          }
        }
      }

      // Delete product record
      const { error } = await supabase.from('merchandise').delete().eq('id', productId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Get all products (public)
  async getProducts(params: {
    category?: string
    limit?: number
    offset?: number
    sort?: string
  } = {}): Promise<any[]> {
    if (!isConfigured) {
      return []
    }

    let query = supabase.from('merchandise').select('*')

    if (params.category) {
      query = query.eq('category', params.category)
    }

    query = query
      .order(params.sort === 'price' ? 'price' : 'created_at', { ascending: params.sort === 'price' })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1)

    const { data } = await query
    return data || []
  }

  // Get product by ID (public)
  async getProduct(productId: string): Promise<any | null> {
    if (!isConfigured) {
      return null
    }

    const { data } = await supabase
      .from('merchandise')
      .select('*')
      .eq('id', productId)
      .single()

    return data
  }

  // Update order status (admin only)
  async updateOrderStatus(
    orderId: string,
    status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  ): Promise<{ success: boolean; error?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return { success: false, error: 'Only admins can update orders' }
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Get all orders (admin)
  async getAllOrders(params: {
    status?: string
    limit?: number
    offset?: number
  } = {}): Promise<any[]> {
    if (!isConfigured) {
      return []
    }

    const user = useAuthStore.getState().user
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return []
    }

    let query = supabase
      .from('orders')
      .select('*, profiles:user_id(full_name, email), order_items(*, merchandise(title, images))')

    if (params.status) {
      query = query.eq('status', params.status)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(params.offset || 0, (params.offset || 0) + (params.limit || 20) - 1)

    const { data } = await query
    return data || []
  }

  // Create category (admin only)
  async createCategory(categoryData: {
    name: string
    slug: string
    description?: string
    icon?: string
  }): Promise<{ success: boolean; error?: string; categoryId?: string }> {
    if (!isConfigured) {
      return { success: false, error: 'Supabase not configured' }
    }

    const user = useAuthStore.getState().user
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return { success: false, error: 'Only admins can create categories' }
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, categoryId: data.id }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const productService = new ProductService()
export default productService
