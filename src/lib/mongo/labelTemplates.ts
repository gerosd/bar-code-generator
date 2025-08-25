import { Collection, ObjectId } from 'mongodb'
import { getCollection } from './client'
import type { 
    LabelTemplateDocument, 
    LabelTemplate, 
    CreateLabelTemplateData, 
    UpdateLabelTemplateData,
    LabelElement
} from '@/lib/types/labelEditor'

const LABEL_TEMPLATE_COLLECTION_NAME = "labelTemplates";

/**
 * Получить коллекцию шаблонов этикеток
 */
async function getLabelTemplatesCollection(): Promise<Collection<LabelTemplateDocument>> {
    return (await getCollection(LABEL_TEMPLATE_COLLECTION_NAME) as unknown as Collection<LabelTemplateDocument>);
}

/**
 * Создать новый шаблон этикетки
 */
export async function createLabelTemplate(data: CreateLabelTemplateData): Promise<LabelTemplate> {
    const collection = await getLabelTemplatesCollection()
    
    const templateDoc: Omit<LabelTemplateDocument, '_id'> = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
    }
    
    const result = await collection.insertOne(templateDoc as LabelTemplateDocument)
    
    return {
        id: result.insertedId.toString(),
        clientId: templateDoc.clientId,
        name: templateDoc.name,
        description: templateDoc.description,
        elements: templateDoc.elements,
        labelSize: templateDoc.labelSize,
        createdAt: templateDoc.createdAt,
        updatedAt: templateDoc.updatedAt
    }
}

/**
 * Получить шаблон этикетки по ID
 */
export async function getLabelTemplateById(templateId: string): Promise<LabelTemplate | null> {
    const collection = await getLabelTemplatesCollection()
    
    const doc = await collection.findOne({ _id: new ObjectId(templateId) })
    
    if (!doc) return null
    
    return {
        id: doc._id.toString(),
        clientId: doc.clientId,
        name: doc.name,
        description: doc.description,
        elements: doc.elements,
        labelSize: doc.labelSize,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
    }
}

/**
 * Получить все шаблоны клиента
 */
export async function getLabelTemplatesByClient(clientId: string): Promise<LabelTemplate[]> {
    const collection = await getLabelTemplatesCollection()
    
    const docs = await collection
        .find({ clientId })
        .sort({ updatedAt: -1 })
        .toArray()
    
    return docs.map(doc => ({
        id: doc._id.toString(),
        clientId: doc.clientId,
        name: doc.name,
        description: doc.description,
        elements: doc.elements,
        labelSize: doc.labelSize,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
    }))
}

/**
 * Обновить шаблон этикетки
 */
export async function updateLabelTemplate(
    templateId: string, 
    data: UpdateLabelTemplateData
): Promise<LabelTemplate | null> {
    const collection = await getLabelTemplatesCollection()
    
    const updateData = {
        ...data,
        updatedAt: new Date()
    }
    
    const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(templateId) },
        { $set: updateData },
        { returnDocument: 'after' }
    )
    
    if (!result) return null
    
    return {
        id: result._id.toString(),
        clientId: result.clientId,
        name: result.name,
        description: result.description,
        elements: result.elements,
        labelSize: result.labelSize,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
    }
}

/**
 * Удалить шаблон этикетки
 */
export async function deleteLabelTemplate(templateId: string): Promise<boolean> {
    const collection = await getLabelTemplatesCollection()
    
    const result = await collection.deleteOne({ _id: new ObjectId(templateId) })
    return result.deletedCount > 0
}

/**
 * Создать предустановленные элементы для нового шаблона
 */
export function createDefaultElements(): LabelElement[] {
    return [
        {
            id: 'productName',
            type: 'productName',
            position: { x: 10, y: 10 },
            fontSize: 20,
            visible: true
        },
        {
            id: 'nmId',
            type: 'nmId',
            position: { x: 10, y: 70 },
            fontSize: 20,
            visible: true
        },
        {
            id: 'vendorCode',
            type: 'vendorCode',
            position: { x: 10, y: 130 },
            fontSize: 20,
            visible: true
        },
        {
            id: 'productSize',
            type: 'productSize',
            position: { x: 10, y: 220 },
            fontSize: 20,
            visible: true
        },
        {
            id: 'dataMatrix',
            type: 'dataMatrix',
            position: { x: 270, y: 120 },
            visible: true
        }
    ]
}