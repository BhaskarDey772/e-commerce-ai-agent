import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatButton, ChatWidget } from "@/components/ChatWidget";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number | null;
  originalPrice?: number | null;
  image?: string;
  images?: string[];
  description?: string;
  rating?: number | null;
  brand?: string;
  specifications?: Record<string, unknown>;
  productUrl?: string;
  productRating?: number | null;
  overallRating?: number | null;
}

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    filters: {
      category?: string;
      brand?: string;
      minPrice?: number;
      maxPrice?: number;
      minRating?: number;
      search?: string;
      sortBy: string;
    };
  };
}

import { config } from "@/lib/config";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productDetails, setProductDetails] = useState<Product | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Filters
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [selectedCategory, selectedBrand, minPrice, maxPrice, minRating, sortBy, debouncedSearch]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadMoreProducts();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, loadingMore]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/products/categories/list`);
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/products/brands/list`);
      const data = await res.json();
      if (data.success) {
        setBrands(data.data.brands);
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    }
  };

  const fetchProducts = async (pageNum: number = 1, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "50",
        sortBy,
      });

      if (debouncedSearch) params.append("search", debouncedSearch);
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedBrand) params.append("brand", selectedBrand);
      if (minPrice) params.append("minPrice", minPrice);
      if (maxPrice) params.append("maxPrice", maxPrice);
      if (minRating) params.append("minRating", minRating);

      const res = await fetch(`${config.apiBaseUrl}/products?${params}`);
      const data: ProductsResponse = await res.json();

      if (data.success) {
        const newProducts = data.data.products;
        if (reset) {
          setProducts(newProducts);
        } else {
          setProducts((prev) => [...prev, ...newProducts]);
        }

        const totalPages = data.data.pagination.totalPages;
        setHasMore(pageNum < totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreProducts = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchProducts(page + 1, false);
    }
  }, [page, loadingMore, hasMore]);

  const fetchProductDetails = async (productId: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${config.apiBaseUrl}/products/${productId}`);
      const data = await res.json();

      if (data.success) {
        setProductDetails(data.data);
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setSelectedImageIndex(0);
    fetchProductDetails(product.id);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedBrand("");
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setSortBy("newest");
  };

  const activeFiltersCount = [
    selectedCategory,
    selectedBrand,
    minPrice,
    maxPrice,
    minRating,
  ].filter(Boolean).length;

  const allImages = productDetails?.images?.length
    ? productDetails.images
    : productDetails?.image
      ? [productDetails.image]
      : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Products</h1>
          <p className="text-muted-foreground mt-1">Discover amazing deals</p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-12 text-base bg-card border-border/50 focus:border-primary"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Filter Products</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear all
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Combobox
              options={categories}
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              placeholder="All Categories"
              searchPlaceholder="Search categories..."
              emptyMessage="No categories found."
            />

            <Combobox
              options={brands}
              value={selectedBrand}
              onValueChange={setSelectedBrand}
              placeholder="All Brands"
              searchPlaceholder="Search brands..."
              emptyMessage="No brands found."
            />

            <Input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="bg-secondary/50"
            />

            <Input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="bg-secondary/50"
            />

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="rating_desc">Highest Rated</SelectItem>
                <SelectItem value="name_asc">Name: A-Z</SelectItem>
                <SelectItem value="name_desc">Name: Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-28 h-28 md:w-36 md:h-36 rounded-lg bg-muted shimmer" />
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-20 bg-muted rounded shimmer" />
                  <div className="h-6 w-3/4 bg-muted rounded shimmer" />
                  <div className="h-4 w-1/2 bg-muted rounded shimmer" />
                  <div className="h-6 w-24 bg-muted rounded shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => handleProductClick(product)}
              index={index}
            />
          ))}

          {/* Infinite scroll trigger */}
          <div ref={observerTarget} className="h-10 flex items-center justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Details Dialog */}
      <Dialog
        open={!!selectedProduct}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProduct(null);
            setSelectedImageIndex(0);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0 glass-card border-border/50">
          {loadingDetails ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading product details...</p>
            </div>
          ) : productDetails ? (
            <div className="overflow-y-auto custom-scrollbar max-h-[90vh]">
              <DialogHeader className="p-6 pb-4 border-b border-border/50">
                <div className="flex items-start gap-2">
                  {productDetails.brand && (
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      {productDetails.brand}
                    </Badge>
                  )}
                  {productDetails.category && (
                    <Badge variant="outline">{productDetails.category}</Badge>
                  )}
                </div>
                <DialogTitle className="text-2xl font-bold mt-2">{productDetails.name}</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                {/* Images Section */}
                <div className="space-y-4">
                  {allImages.length > 0 && (
                    <div className="relative aspect-square bg-secondary/50 rounded-xl overflow-hidden">
                      <img
                        src={allImages[selectedImageIndex]}
                        alt={productDetails.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/500?text=No+Image";
                        }}
                      />
                      {allImages.length > 1 && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                            onClick={() =>
                              setSelectedImageIndex((prev) =>
                                prev === 0 ? allImages.length - 1 : prev - 1,
                              )
                            }
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                            onClick={() =>
                              setSelectedImageIndex((prev) =>
                                prev === allImages.length - 1 ? 0 : prev + 1,
                              )
                            }
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImageIndex === idx
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <img
                            src={img}
                            alt={`${productDetails.name} ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://via.placeholder.com/150";
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-6">
                  {/* Price */}
                  <div className="glass-card rounded-xl p-4">
                    {productDetails.price ? (
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-3xl font-bold text-primary">
                          ₹{productDetails.price.toLocaleString()}
                        </span>
                        {productDetails.originalPrice &&
                          productDetails.originalPrice > productDetails.price && (
                            <>
                              <span className="text-lg text-muted-foreground line-through">
                                ₹{productDetails.originalPrice.toLocaleString()}
                              </span>
                              <Badge className="bg-success text-success-foreground">
                                {Math.round(
                                  ((productDetails.originalPrice - productDetails.price) /
                                    productDetails.originalPrice) *
                                    100,
                                )}
                                % off
                              </Badge>
                            </>
                          )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Price not available</span>
                    )}
                  </div>

                  {/* Rating */}
                  {(productDetails.rating ||
                    productDetails.productRating ||
                    productDetails.overallRating) && (
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xl font-semibold">
                        {(
                          productDetails.rating ||
                          productDetails.productRating ||
                          productDetails.overallRating
                        )?.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">/ 5</span>
                    </div>
                  )}

                  {/* Description */}
                  {productDetails.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {productDetails.description}
                      </p>
                    </div>
                  )}

                  {/* Specifications */}
                  {productDetails.specifications && (
                    <div>
                      <h3 className="font-semibold mb-2">Specifications</h3>
                      <div className="glass-card rounded-lg p-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                        {(() => {
                          const specs = productDetails.specifications;
                          if (
                            specs &&
                            typeof specs === "object" &&
                            "product_specification" in specs &&
                            Array.isArray(specs.product_specification)
                          ) {
                            return specs.product_specification
                              .map((item: { key?: string; value?: unknown }, idx: number) => {
                                if (item?.key && item.value !== undefined) {
                                  return (
                                    <div
                                      key={idx}
                                      className="flex gap-2 text-sm py-1 border-b border-border/50 last:border-b-0"
                                    >
                                      <span className="font-medium text-muted-foreground min-w-[140px] flex-shrink-0">
                                        {item.key}
                                      </span>
                                      <span>{String(item.value)}</span>
                                    </div>
                                  );
                                }
                                return null;
                              })
                              .filter(Boolean);
                          }
                          if (specs && typeof specs === "object") {
                            return Object.entries(specs)
                              .map(([key, value]) => {
                                if (key === "product_specification" && Array.isArray(value))
                                  return null;
                                return (
                                  <div
                                    key={key}
                                    className="flex gap-2 text-sm py-1 border-b border-border/50 last:border-b-0"
                                  >
                                    <span className="font-medium text-muted-foreground min-w-[140px] flex-shrink-0">
                                      {key}
                                    </span>
                                    <span>
                                      {typeof value === "object"
                                        ? JSON.stringify(value)
                                        : String(value)}
                                    </span>
                                  </div>
                                );
                              })
                              .filter(Boolean);
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  )}

                  {/* CTA Button */}
                  {productDetails.productUrl && (
                    <Button
                      onClick={() => window.open(productDetails.productUrl, "_blank")}
                      className="w-full gap-2 glow-hover"
                      size="lg"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Product
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Chat Widget */}
      {chatOpen ? (
        <ChatWidget
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          onMinimize={() => setChatOpen(false)}
        />
      ) : (
        <ChatButton onClick={() => setChatOpen(true)} />
      )}
    </div>
  );
}
