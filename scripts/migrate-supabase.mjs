import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import PROMOTORAS from "../../Catalogo/data/promotoras.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Error: Las variables de entorno NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY son requeridas");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log("🚀 Iniciando migración a Supabase...");

    try {
        for (const talent of PROMOTORAS) {
            console.log(`📤 Subiendo: ${talent.nombre}...`);

            const { id, ...talentData } = talent;

            const { error } = await supabase
                .from("talents")
                .insert([
                    {
                        nombre: talentData.nombre,
                        genero: talentData.genero,
                        altura: talentData.altura,
                        experiencia: talentData.experiencia,
                        especialidad: talentData.especialidad,
                        descripcion: talentData.descripcion,
                        foto_url: talentData.fotos[0],
                        tags: talentData.tags,
                        active: true
                    }
                ]);

            if (error) throw error;
        }

        console.log("✅ Migración completada con éxito!");
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

migrate();
