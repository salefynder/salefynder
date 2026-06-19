import urllib.request, json

SUPABASE_URL = 'https://gzoqehooamrudcevfybf.supabase.co'
SUPABASE_KEY = 'sb_publishable_3xhPUfoa2u_EKG5je44FTA_2P-m6LC4'

sales = [
    {
        'sale': {'title': 'Moving Sale — Everything Must Go', 'address': '742 Willamette St', 'city': 'Eugene', 'state': 'OR', 'zip': '97401', 'description': 'Relocating out of state. Furniture, books, kitchen gear and more.', 'date_start': '2026-06-27', 'date_end': '2026-06-28', 'lat': 44.051731, 'lng': -123.092843},
        'items': [{'name': 'Vintage floor lamp', 'category': 'other', 'price': 35}, {'name': 'Oak dining table with 4 chairs', 'category': 'furniture', 'price': 250}, {'name': 'Box of paperback novels', 'category': 'books', 'price': 10}],
    },
    {
        'sale': {'title': 'Estate Sale — 3 Days Only', 'address': '1856 Oak Patch Rd', 'city': 'Eugene', 'state': 'OR', 'zip': '97402', 'description': 'Clearing out a lifetime of treasures. Antiques, jewelry, kitchenware.', 'date_start': '2026-06-27', 'date_end': '2026-06-29', 'lat': 44.047651, 'lng': -123.135396},
        'items': [{'name': 'Antique oak dresser', 'category': 'furniture', 'price': 180}, {'name': 'Pearl necklace', 'category': 'jewelry', 'price': 60}, {'name': 'Cast iron skillet set', 'category': 'kitchen', 'price': 45}, {'name': 'Garden hand tools', 'category': 'tools', 'price': 20}],
    },
    {
        'sale': {'title': 'Garage Cleanout Sale', 'address': '345 Chambers St', 'city': 'Eugene', 'state': 'OR', 'zip': '97402', 'description': 'Too much stuff, not enough garage. Tools, bikes, outdoor gear.', 'date_start': '2026-07-04', 'date_end': '2026-07-05', 'lat': 44.056701, 'lng': -123.117426},
        'items': [{'name': 'Cordless drill set', 'category': 'tools', 'price': 55}, {'name': 'Trek mountain bike', 'category': 'sports', 'price': 150}, {'name': 'Gas lawn mower', 'category': 'tools', 'price': 80}],
    },
    {
        'sale': {'title': 'Baby & Kids Sale', 'address': '2210 Friendly St', 'city': 'Eugene', 'state': 'OR', 'zip': '97405', 'description': 'Kids grew up fast. Great deals on baby gear and toys.', 'date_start': '2026-06-27', 'date_end': '2026-06-27', 'lat': 44.035286, 'lng': -123.105623},
        'items': [{'name': 'Graco stroller', 'category': 'other', 'price': 75}, {'name': 'Wooden train set', 'category': 'toys', 'price': 30}, {'name': 'Baby monitor', 'category': 'electronics', 'price': 25}, {'name': 'High chair', 'category': 'furniture', 'price': 40}],
    },
    {
        'sale': {'title': 'Downsizing Sale', 'address': '1432 Amazon Pkwy', 'city': 'Eugene', 'state': 'OR', 'zip': '97405', 'description': 'Moving to a smaller place. Large furniture and appliances priced to sell.', 'date_start': '2026-07-11', 'date_end': '2026-07-12', 'lat': 44.032188, 'lng': -123.088178},
        'items': [{'name': 'Leather sectional sofa', 'category': 'furniture', 'price': 400}, {'name': '55-inch flat screen TV', 'category': 'electronics', 'price': 120}, {'name': 'KitchenAid stand mixer', 'category': 'kitchen', 'price': 90}],
    },
    {
        'sale': {'title': 'Neighborhood Yard Sale', 'address': '3105 Donald St', 'city': 'Eugene', 'state': 'OR', 'zip': '97405', 'description': 'Clothes, home decor, and random goodies from multiple households.', 'date_start': '2026-07-04', 'date_end': '2026-07-04', 'lat': 43.998216, 'lng': -123.090181},
        'items': [{'name': 'Mixed clothing sizes S-M', 'category': 'clothing', 'price': 5}, {'name': 'Wooden coffee table', 'category': 'furniture', 'price': 60}, {'name': 'Framed wall art', 'category': 'other', 'price': 15}],
    },
    {
        'sale': {'title': 'Outdoor & Adventure Gear Sale', 'address': '875 River Rd', 'city': 'Eugene', 'state': 'OR', 'zip': '97404', 'description': 'Kayak, camping gear, and more. All in great condition.', 'date_start': '2026-06-27', 'date_end': '2026-06-28', 'lat': 44.076297, 'lng': -123.119784},
        'items': [{'name': 'Sit-on-top kayak', 'category': 'sports', 'price': 300}, {'name': '4-person camping tent', 'category': 'sports', 'price': 85}, {'name': 'Set of folding camp chairs', 'category': 'other', 'price': 30}],
    },
    {
        'sale': {'title': 'Estate Sale — Antiques & Collectibles', 'address': '4521 Main St', 'city': 'Springfield', 'state': 'OR', 'zip': '97478', 'description': 'Lifetime collection of antiques. China, clocks, and original paintings.', 'date_start': '2026-07-11', 'date_end': '2026-07-12', 'lat': 44.045673, 'lng': -122.956342},
        'items': [{'name': 'Vintage china set 12-piece', 'category': 'antiques', 'price': 120}, {'name': 'Grandfather clock', 'category': 'antiques', 'price': 350}, {'name': 'Framed oil paintings set of 3', 'category': 'antiques', 'price': 90}],
    },
    {
        'sale': {'title': 'Multi-Family Garage Sale', 'address': '2934 Olympic St', 'city': 'Springfield', 'state': 'OR', 'zip': '97477', 'description': 'Three families cleaned out their garages. Huge variety of items.', 'date_start': '2026-06-27', 'date_end': '2026-06-28', 'lat': 44.059488, 'lng': -122.984171},
        'items': [{'name': 'Ryobi power tool set', 'category': 'tools', 'price': 110}, {'name': 'Kids bikes 16 and 20 inch', 'category': 'sports', 'price': 50}, {'name': 'Board games lot of 12', 'category': 'toys', 'price': 25}, {'name': 'Hunting vest and gear', 'category': 'sports', 'price': 45}],
    },
    {
        'sale': {'title': 'Home Gym Equipment Sale', 'address': '1678 Mohawk Blvd', 'city': 'Springfield', 'state': 'OR', 'zip': '97477', 'description': 'Clearing out the home gym. All equipment works great.', 'date_start': '2026-07-04', 'date_end': '2026-07-05', 'lat': 44.060274, 'lng': -122.999191},
        'items': [{'name': 'Folding treadmill', 'category': 'sports', 'price': 200}, {'name': 'Dumbbell set 5 to 50 lb', 'category': 'sports', 'price': 130}, {'name': 'Yoga mats set of 3', 'category': 'sports', 'price': 15}],
    },
    {
        'sale': {'title': 'Vintage Records & Collectibles', 'address': '956 Harlow Rd', 'city': 'Springfield', 'state': 'OR', 'zip': '97477', 'description': 'Curated collection of vintage records, cards, and memorabilia.', 'date_start': '2026-07-11', 'date_end': '2026-07-12', 'lat': 44.070886, 'lng': -123.031958},
        'items': [{'name': 'Vinyl record collection 80 LPs', 'category': 'antiques', 'price': 75}, {'name': 'Baseball card binders', 'category': 'antiques', 'price': 40}, {'name': 'Vintage tin advertising signs', 'category': 'antiques', 'price': 30}, {'name': '35mm film cameras', 'category': 'electronics', 'price': 55}],
    },
    {
        'sale': {'title': 'Tool & Workshop Sale', 'address': '1290 G St', 'city': 'Springfield', 'state': 'OR', 'zip': '97477', 'description': 'Retiring woodworker selling shop tools, fishing rods, and golf clubs.', 'date_start': '2026-06-27', 'date_end': '2026-06-28', 'lat': 44.052376, 'lng': -123.007231},
        'items': [{'name': 'Craftsman table saw', 'category': 'tools', 'price': 275}, {'name': 'Fishing rod and reel combos', 'category': 'sports', 'price': 60}, {'name': 'Full golf club set with bag', 'category': 'sports', 'price': 95}],
    },
    {
        'sale': {'title': 'Furniture & Appliances — Must Sell', 'address': '2801 Hilyard St', 'city': 'Eugene', 'state': 'OR', 'zip': '97405', 'description': 'Large items only. Bring a truck. All priced well below Craigslist.', 'date_start': '2026-07-04', 'date_end': '2026-07-05', 'lat': 44.026971, 'lng': -123.081385},
        'items': [{'name': 'Sectional sofa', 'category': 'furniture', 'price': 350}, {'name': '6-person dining set', 'category': 'furniture', 'price': 220}, {'name': 'Washer and dryer set', 'category': 'other', 'price': 300}],
    },
    {
        'sale': {'title': 'Vintage Clothing & Record Player Sale', 'address': '445 W 11th Ave', 'city': 'Eugene', 'state': 'OR', 'zip': '97401', 'description': 'Curated vintage threads and audio gear from the 70s and 80s.', 'date_start': '2026-07-11', 'date_end': '2026-07-12', 'lat': 44.047791, 'lng': -123.099524},
        'items': [{'name': 'Vintage denim jackets', 'category': 'clothing', 'price': 25}, {'name': 'Pioneer record player', 'category': 'electronics', 'price': 110}, {'name': 'Bar stools set of 3', 'category': 'furniture', 'price': 75}],
    },
    {
        'sale': {'title': 'Moving Sale — Priced to Sell Fast', 'address': '3467 Gateway St', 'city': 'Springfield', 'state': 'OR', 'zip': '97477', 'description': 'Moving this weekend, everything must go. Deep discounts on everything.', 'date_start': '2026-06-27', 'date_end': '2026-06-27', 'lat': 44.083551, 'lng': -123.041475},
        'items': [{'name': 'Queen bed frame and mattress', 'category': 'furniture', 'price': 150}, {'name': 'Singer sewing machine', 'category': 'other', 'price': 65}, {'name': 'Cookware set 12-piece', 'category': 'kitchen', 'price': 50}],
    },
]

def post(path, body):
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/{path}',
        data=data,
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        },
        method='POST',
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

for i, entry in enumerate(sales):
    result = post('sales', entry['sale'])
    sale_id = result[0]['id']
    items_to_insert = [{**item, 'sale_id': sale_id} for item in entry['items']]
    post('items', items_to_insert)
    print(f'[{i+1:2}/15] Inserted: {entry["sale"]["title"]}  (id={sale_id})')

print('\nDone. 15 sales and all items inserted.')
