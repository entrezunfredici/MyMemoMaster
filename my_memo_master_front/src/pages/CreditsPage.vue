<template>
    <div>
        <section id="thank_you" class="flex flex-col gap-6">
            <p>
                Je tiens à remercier chaleureusement toutes les personnes qui ont travaillé sur My Memo Master, qui
                ont fourni un excellent travail et ont donné de leur temps pour créer cet outil qui, je l'espère,
                aidera de nombreux étudiants dans leurs révisions.
            </p>
            <p>- Fred</p>

            <table class="credits-table w-full border-collapse text-left">
                <thead>
                    <tr>
                        <th>Prénom</th>
                        <th>Nom</th>
                        <th>Fonction</th>
                        <th>Période</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="member in teamMembers" :key="`${member.firstName}-${member.lastName || member.role}`">
                        <td>{{ member.firstName }}</td>
                        <td>{{ member.lastName || 'N/A' }}</td>
                        <td>{{ member.role }}</td>
                        <td>{{ member.period }}</td>
                    </tr>
                </tbody>
            </table>
        </section>
    </div>
</template>

<script setup>
const teamMembers = [
    { firstName: 'Cléula', lastName: 'Potorel', role: 'UI/UX designer', period: '17/10/2024 - 01/07/2025' },
    { firstName: 'Anthony', lastName: 'Lalba', role: 'Lead tech, développeur & associé', period: '17/10/2024 - +∞' },
    { firstName: 'Gaia', lastName: 'Ducourneau', role: 'Développeuse', period: '17/10/2024 - 01/07/2026' },
    { firstName: 'Jorgelina', lastName: 'Ledesma', role: 'Développeuse', period: '17/10/2024 - 01/07/2026' },
    { firstName: 'Nicolas', lastName: 'Poda', role: 'Développeur', period: '17/10/2024 - 01/07/2025' },
    { firstName: 'Quentin', lastName: 'Ghilamasse', role: 'Développeur', period: '17/10/2024 - 01/07/2025' },
    { firstName: 'Jordan', lastName: '', role: 'Développeur', period: '17/10/2024 - 01/07/2025' },
    { firstName: 'Lena', lastName: 'Ricard', role: 'Développeuse', period: '29/10/2024 - 01/07/2026' },
    { firstName: 'Iulas', lastName: 'Ouandouri', role: 'Développeur', period: '29/10/2024 - 01/07/2026' },
    { firstName: 'Achouak', lastName: 'Dairak', role: 'Experte IA', period: '29/10/2024 - 01/07/2026' },
    { firstName: 'Isra', lastName: 'Guesmi', role: 'Experte IA', period: '29/10/2024 - 01/07/2026' },
    { firstName: 'Ouassim', lastName: 'Djekoun Hocine', role: 'Expert IA', period: '29/10/2024 - 01/07/2026' },
    { firstName: 'Abel', lastName: 'Giroud', role: 'Expert en marketing & communication', period: '29/10/2024 - 01/07/2026' },
    { firstName: 'Valentin', lastName: '', role: 'Administrateur système & DevOps', period: '29/10/2024 - 01/07/2026' },
];
</script>
