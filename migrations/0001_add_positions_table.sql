-- Create positions table
CREATE TABLE IF NOT EXISTS "positions" (
        "id" serial PRIMARY KEY NOT NULL,
        "position_code" varchar(50) NOT NULL,
        "position_name" varchar(100) NOT NULL,
        "level" integer NOT NULL,
        "department" varchar(100),
        "description" text,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);

-- Add unique constraint on position_code
ALTER TABLE "positions" ADD CONSTRAINT "positions_position_code_unique" UNIQUE("position_code");

-- Add position_id column to users table
ALTER TABLE "users" ADD COLUMN "position_id" integer;

-- Add foreign key constraint
ALTER TABLE "users" ADD CONSTRAINT "users_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE no action ON UPDATE no action;

-- Insert default positions data (simplified 5-position hierarchy)
INSERT INTO "positions" ("position_code", "position_name", "level", "department", "description") VALUES
('CEO', '대표이사', 1, '경영진', '최고경영자'),
('MANAGER', '부장', 2, '관리부서', '부서 총괄 관리자'),
('LEADER', '과장', 3, '실무부서', '팀 리더 및 프로젝트 관리자'),
('SENIOR', '대리', 4, '실무부서', '숙련된 실무 담당자'),
('STAFF', '사원', 5, '실무부서', '일반 실무 담당자');

-- Migrate existing position data from varchar to position_id (simplified mapping)
UPDATE "users" SET "position_id" = (
        CASE 
                WHEN "position" LIKE '%대표%' OR "position" LIKE '%CEO%' THEN (SELECT id FROM positions WHERE position_code = 'CEO')
                WHEN "position" LIKE '%부장%' OR "position" LIKE '%팀장%' OR "position" LIKE '%부문장%' THEN (SELECT id FROM positions WHERE position_code = 'MANAGER')
                WHEN "position" LIKE '%과장%' OR "position" LIKE '%리더%' THEN (SELECT id FROM positions WHERE position_code = 'LEADER')
                WHEN "position" LIKE '%대리%' OR "position" LIKE '%선임%' THEN (SELECT id FROM positions WHERE position_code = 'SENIOR')
                ELSE (SELECT id FROM positions WHERE position_code = 'STAFF')
        END
) WHERE "position" IS NOT NULL;

-- Drop the old position column
ALTER TABLE "users" DROP COLUMN "position";