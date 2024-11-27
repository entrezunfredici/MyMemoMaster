import {getAllFieldTypes} from '@/services/fieldTypeService';

export default async function handler(req , res) {
    if (req.method === 'GET'){
        try {
            const fieldTypes = await getAllFieldTypes();
            res.status(200).json(fieldTypes);
            
        } catch (error) {
            res.status(500).json({message : 'Erreur lors de la récupération des types de champ', error});

            
        }
    }else{
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Méthode ${req.method} non autorisée`);
    }
    
}