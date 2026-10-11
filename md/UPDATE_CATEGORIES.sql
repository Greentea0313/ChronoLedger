-- 1. 기존 CHECK 제약조건 제거 및 새 조건 추가
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_category_check;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_category_check 
  CHECK (category IN ('게임', '정기 구독', '식비/카페', '식비', '교통/이동', '교통', '생활/쇼핑', '생활', '기타'));

-- 기존 데이터 마이그레이션 (선택 사항이나 깔끔한 데이터 관리를 위해)
UPDATE public.expenses SET category = '식비' WHERE category = '식비/카페';
UPDATE public.expenses SET category = '교통' WHERE category = '교통/이동';
UPDATE public.expenses SET category = '생활' WHERE category = '생활/쇼핑';

UPDATE public.subscription_templates SET category = '식비' WHERE category = '식비/카페';
UPDATE public.subscription_templates SET category = '교통' WHERE category = '교통/이동';
UPDATE public.subscription_templates SET category = '생활' WHERE category = '생활/쇼핑';

