"""
ShopWave ML Service — FastAPI
Handles: product recommendations, search ranking, price analytics, sentiment analysis
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from collections import defaultdict, Counter
import math
import re
from datetime import datetime, timedelta

app = FastAPI(title="ShopWave ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-Memory Data Structures ────────────────────────────────────────────────
# In production replace with Redis + MongoDB queries

# user_id → list of product_id viewed/purchased
user_history: dict[str, list[str]] = defaultdict(list)

# product_id → list of user_ids who viewed it
product_viewers: dict[str, list[str]] = defaultdict(list)

# product_id → purchase count
purchase_counts: dict[str, int] = defaultdict(int)

# (product_a, product_b) → co-purchase count
co_purchases: dict[tuple, int] = defaultdict(int)

# ─── Pydantic Models ──────────────────────────────────────────────────────────

class TrackEvent(BaseModel):
    user_id: str
    product_id: str
    event_type: str   # "view" | "add_cart" | "purchase"
    timestamp: Optional[str] = None

class Product(BaseModel):
    id: str
    name: str
    category: str
    price: float
    rating: float
    tags: List[str] = []
    sold_count: int = 0

class SearchRequest(BaseModel):
    query: str
    products: List[Product]
    user_id: Optional[str] = None
    limit: int = 10

class ReviewSentiment(BaseModel):
    review_text: str

class PriceRequest(BaseModel):
    product_id: str
    current_price: float
    category: str
    competitor_prices: List[float] = []
    sales_velocity: float = 0.0

# ─── 1. Event Tracking ────────────────────────────────────────────────────────

@app.post("/track")
def track_event(event: TrackEvent):
    uid  = event.user_id
    pid  = event.product_id
    etype = event.event_type

    user_history[uid].append(pid)
    product_viewers[pid].append(uid)

    if etype == "purchase":
        purchase_counts[pid] += 1
        # Record co-purchases with recent items
        recent = user_history[uid][-6:-1]
        for other_pid in recent:
            if other_pid != pid:
                key = tuple(sorted([pid, other_pid]))
                co_purchases[key] += 1

    return {"success": True, "event": etype}

# ─── 2. Collaborative Filtering Recommendations ───────────────────────────────

@app.get("/recommendations/{user_id}")
def get_recommendations(user_id: str, limit: int = 8):
    """
    Simple user-based collaborative filtering.
    Finds users with similar history, recommends what they viewed.
    """
    my_history = set(user_history.get(user_id, []))

    if not my_history:
        # Cold start: return most popular
        popular = sorted(purchase_counts.items(), key=lambda x: x[1], reverse=True)[:limit]
        return {"user_id": user_id, "recommendations": [p[0] for p in popular], "strategy": "popular"}

    # Find similar users (Jaccard similarity)
    scores: dict[str, float] = defaultdict(float)
    for pid in my_history:
        for other_uid in product_viewers.get(pid, []):
            if other_uid == user_id:
                continue
            other_history = set(user_history.get(other_uid, []))
            intersection  = len(my_history & other_history)
            union         = len(my_history | other_history)
            similarity    = intersection / union if union else 0
            # Recommend products this similar user viewed that I haven't
            for other_pid in other_history - my_history:
                scores[other_pid] += similarity

    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:limit]
    recs   = [r[0] for r in ranked]

    # Pad with popular if not enough
    if len(recs) < limit:
        popular = [p[0] for p in sorted(purchase_counts.items(), key=lambda x: x[1], reverse=True)]
        for p in popular:
            if p not in my_history and p not in recs:
                recs.append(p)
            if len(recs) >= limit:
                break

    return {"user_id": user_id, "recommendations": recs, "strategy": "collaborative"}

# ─── 3. "Frequently Bought Together" ─────────────────────────────────────────

@app.get("/also-bought/{product_id}")
def also_bought(product_id: str, limit: int = 4):
    related = {}
    for (a, b), count in co_purchases.items():
        if a == product_id:
            related[b] = count
        elif b == product_id:
            related[a] = count

    sorted_related = sorted(related.items(), key=lambda x: x[1], reverse=True)[:limit]
    return {"product_id": product_id, "also_bought": [r[0] for r in sorted_related]}

# ─── 4. Semantic Search Ranking ───────────────────────────────────────────────

@app.post("/search/rank")
def rank_search_results(req: SearchRequest):
    """
    TF-IDF style ranking of products by search relevance + popularity boost.
    """
    query_tokens = set(req.query.lower().split())
    scored = []

    for product in req.products:
        # Build product document
        doc_tokens = (
            product.name.lower().split() +
            product.category.lower().split() +
            [t.lower() for t in product.tags]
        )
        doc_token_counts = Counter(doc_tokens)
        total_tokens     = len(doc_tokens)

        # TF score
        tf_score = sum(
            doc_token_counts.get(token, 0) / max(total_tokens, 1)
            for token in query_tokens
        )

        # Exact match bonus
        exact_bonus = 2.0 if req.query.lower() in product.name.lower() else 0.0

        # Popularity signal (log scale)
        popularity = math.log1p(product.sold_count) * 0.1

        # Rating signal
        rating_boost = (product.rating - 3.0) * 0.2 if product.rating >= 3 else 0

        total_score = tf_score + exact_bonus + popularity + rating_boost
        scored.append((product.id, total_score))

    scored.sort(key=lambda x: x[1], reverse=True)
    return {
        "query":   req.query,
        "results": [{"product_id": s[0], "score": round(s[1], 4)} for s in scored[:req.limit]],
    }

# ─── 5. Review Sentiment Analysis ────────────────────────────────────────────

POSITIVE_WORDS = {"great", "excellent", "amazing", "love", "perfect", "best", "fantastic", "wonderful", "outstanding", "superb", "beautiful", "awesome", "good", "nice", "happy", "satisfied", "recommend"}
NEGATIVE_WORDS = {"bad", "terrible", "awful", "horrible", "worst", "hate", "disappointed", "broken", "defective", "useless", "waste", "poor", "cheap", "fail", "failed", "return", "refund"}
INTENSIFIERS   = {"very", "extremely", "incredibly", "absolutely", "totally", "really", "so"}

@app.post("/sentiment")
def analyze_sentiment(req: ReviewSentiment):
    words  = re.findall(r'\b\w+\b', req.review_text.lower())
    tokens = set(words)

    pos_hits = tokens & POSITIVE_WORDS
    neg_hits = tokens & NEGATIVE_WORDS

    # Intensifier multiplier
    multiplier = 1.5 if tokens & INTENSIFIERS else 1.0

    pos_score = len(pos_hits) * multiplier
    neg_score = len(neg_hits) * multiplier

    # Negation detection
    for i, word in enumerate(words[:-1]):
        if word in ("not", "no", "never", "don't", "doesn't", "didn't"):
            next_word = words[i + 1]
            if next_word in POSITIVE_WORDS:
                pos_score -= 1; neg_score += 1
            elif next_word in NEGATIVE_WORDS:
                neg_score -= 1; pos_score += 1

    total = pos_score + neg_score
    if total == 0:
        label = "neutral"; confidence = 0.5
    elif pos_score > neg_score:
        label = "positive"; confidence = round(pos_score / total, 2)
    else:
        label = "negative"; confidence = round(neg_score / total, 2)

    return {
        "label":      label,
        "confidence": confidence,
        "pos_score":  pos_score,
        "neg_score":  neg_score,
        "keywords":   list(pos_hits | neg_hits),
    }

# ─── 6. Dynamic Pricing Suggestion ───────────────────────────────────────────

@app.post("/pricing/suggest")
def suggest_price(req: PriceRequest):
    """
    Rule-based dynamic pricing: competitor analysis + demand signal.
    """
    suggestions = []

    if req.competitor_prices:
        avg_competitor = np.mean(req.competitor_prices)
        if req.current_price > avg_competitor * 1.15:
            suggestions.append({"action": "lower", "reason": "Price 15%+ above market avg", "suggested": round(avg_competitor * 1.05, 2)})
        elif req.current_price < avg_competitor * 0.85:
            suggestions.append({"action": "raise", "reason": "Underpriced vs market", "suggested": round(avg_competitor * 0.95, 2)})

    if req.sales_velocity > 50:
        suggestions.append({"action": "raise", "reason": "High demand — can command premium", "suggested": round(req.current_price * 1.08, 2)})
    elif req.sales_velocity < 5:
        suggestions.append({"action": "lower", "reason": "Low velocity — consider markdown", "suggested": round(req.current_price * 0.90, 2)})

    return {
        "product_id":    req.product_id,
        "current_price": req.current_price,
        "suggestions":   suggestions,
        "market_avg":    round(float(np.mean(req.competitor_prices)), 2) if req.competitor_prices else None,
    }

# ─── 7. Sales Analytics ──────────────────────────────────────────────────────

@app.get("/analytics/summary")
def analytics_summary():
    total_events   = sum(len(v) for v in user_history.values())
    total_users    = len(user_history)
    total_purchases= sum(purchase_counts.values())
    top_products   = sorted(purchase_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    return {
        "total_events":    total_events,
        "unique_users":    total_users,
        "total_purchases": total_purchases,
        "top_products":    [{"product_id": p, "purchases": c} for p, c in top_products],
        "co_purchase_pairs": len(co_purchases),
    }

# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "ShopWave ML", "timestamp": datetime.utcnow().isoformat()}

# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
