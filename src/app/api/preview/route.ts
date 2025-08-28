import { NextRequest, NextResponse} from "next/server";
import { getPreviewByZPL, generateZPLFromTemplate } from "@/lib/actions/preview-actions";
import { getUserLabelTemplatesAction } from "@/lib/actions/labelTemplate-actions";
import type { LabelTemplate } from "@/lib/types/labelEditor";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        if (!body) {
            return NextResponse.json({
                success: false,
                error: 'Отсутствуют данные'
            }, {status: 400});
        }

        // Если передается готовый ZPL код
        if (body.zplString && body.dpi) {
            const result = await getPreviewByZPL(
                body.zplString, 
                body.dpi, 
                body.labelWidthMm, 
                body.labelHeightMm
            );
            return NextResponse.json(result);
        }
        
        // Если передается шаблон для генерации ZPL
        if (body.template && body.dpi) {
            let template: LabelTemplate;
            const dpi = body.dpi;
            
            // Если запрошен пользовательский шаблон, получаем его из базы данных
            if (body.template === 'custom') {
                const result = await getUserLabelTemplatesAction();
                if (!result.success || !result.data || result.data.length === 0) {
                    return NextResponse.json({
                        success: false,
                        error: 'Пользовательский шаблон не найден'
                    }, {status: 404});
                }
                // Берем первый доступный шаблон
                template = result.data[0];
            } else if (typeof body.template === 'object') {
                // Если передан объект шаблона
                template = body.template;
            } else {
                return NextResponse.json({
                    success: false,
                    error: 'Неверный формат шаблона'
                }, {status: 400});
            }
            
            const zpl = generateZPLFromTemplate(template);
            const result = await getPreviewByZPL(zpl, dpi, template.labelSize.widthMm, template.labelSize.heightMm);
            
            return NextResponse.json({
                ...result,
                zpl: zpl // Возвращаем также сгенерированный ZPL код
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Неверный формат данных. Ожидается либо zplString + dpi, либо template + dpi'
        }, {status: 400});

    } catch (error) {
        console.error("Ошибка при предпросмотре ZPL", error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
        }, {status: 500})
    }
}