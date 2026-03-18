INSERT INTO categories (name, slug)
VALUES
  ('Poly', 'poly'),
  ('General', 'general'),
  ('PolyOrbite', 'polyorbite')
ON CONFLICT (slug) DO NOTHING;
