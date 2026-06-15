import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../hooks/useAppTheme';
import { spacing, typography, borderRadius, colors } from '../../theme';

const PRIVACY_URL = 'https://shinracode.github.io/ShinraFixture2026/privacy';

interface SectionProps {
  title: string;
  children: string;
  textColor: string;
  titleColor: string;
}

function Section({ title, children, textColor, titleColor }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: titleColor }]}>{title}</Text>
      <Text style={[styles.body, { color: textColor }]}>{children}</Text>
    </View>
  );
}

export function PrivacyPolicyScreen() {
  const navigation = useNavigation();
  const { appColors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: appColors.border }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={appColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: appColors.text }]}>Política de Privacidad</Text>
        <View style={styles.back} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { backgroundColor: appColors.background }]}
      >
        <Text style={[styles.lastUpdated, { color: appColors.textSecondary }]}>
          Última actualización: junio de 2026
        </Text>

        <TouchableOpacity
          style={[styles.onlineBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
          onPress={() => Linking.openURL(PRIVACY_URL)}
          activeOpacity={0.7}
        >
          <Ionicons name="globe-outline" size={16} color={colors.primary} />
          <Text style={[styles.onlineBannerText, { color: colors.primary }]}>
            Ver versión actualizada online
          </Text>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </TouchableOpacity>

        <Text style={[styles.intro, { color: appColors.text }]}>
          ShinraCode ("nosotros", "nuestro") opera la aplicación móvil ShinraFixture 2026. Esta página
          informa sobre nuestras políticas respecto a la recopilación, uso y divulgación de datos personales
          cuando usás nuestra aplicación.
        </Text>

        <Section title="1. Información que recopilamos" textColor={appColors.text} titleColor={appColors.text}>
          {`Recopilamos los siguientes tipos de información:\n\n• Datos de cuenta: nombre de usuario, dirección de correo electrónico y contraseña (almacenada en forma cifrada).\n• Datos de uso: predicciones realizadas, partidos vistos, equipos favoritos, interacciones dentro de la app.\n• Datos del dispositivo: modelo del dispositivo, versión del sistema operativo, identificador único para notificaciones push (FCM Token).\n• Datos opcionales: foto de perfil, biografía, país y zona horaria.`}
        </Section>

        <Section title="2. Cómo usamos tu información" textColor={appColors.text} titleColor={appColors.text}>
          {`Usamos la información recopilada para:\n\n• Crear y administrar tu cuenta.\n• Procesar y mostrar tus predicciones y resultados.\n• Enviar notificaciones push sobre partidos, goles y resultados (si las habilitaste).\n• Mejorar la experiencia de la app y corregir errores.\n• Generar estadísticas anónimas de uso.`}
        </Section>

        <Section title="3. Almacenamiento y seguridad" textColor={appColors.text} titleColor={appColors.text}>
          {`Tus datos se almacenan en servidores seguros. Las contraseñas se cifran con bcrypt y nunca se almacenan en texto plano. Los tokens de sesión tienen vencimiento automático.\n\nNo vendemos, alquilamos ni compartimos tu información personal con terceros con fines comerciales.`}
        </Section>

        <Section title="4. Servicios de terceros" textColor={appColors.text} titleColor={appColors.text}>
          {`La app puede utilizar los siguientes servicios de terceros, cada uno con su propia política de privacidad:\n\n• Firebase Cloud Messaging (notificaciones push)\n• OpenAI / GPT-4 (análisis predictivo de partidos, sin datos personales identificables)\n• Expo (plataforma de desarrollo)\n\nNinguno de estos servicios recibe tu contraseña ni datos de pago.`}
        </Section>

        <Section title="5. Datos de menores" textColor={appColors.text} titleColor={appColors.text}>
          {`Esta aplicación no está dirigida a menores de 13 años. No recopilamos conscientemente información personal de menores. Si sos padre o tutor y sabés que tu hijo nos proporcionó datos personales, contactanos para eliminarlos.`}
        </Section>

        <Section title="6. Tus derechos" textColor={appColors.text} titleColor={appColors.text}>
          {`Podés en cualquier momento:\n\n• Acceder a tus datos personales desde la pantalla de Perfil.\n• Modificar o eliminar tu cuenta desde Configuración.\n• Solicitar la eliminación completa de todos tus datos escribiéndonos al correo de contacto.\n• Deshabilitar las notificaciones desde Configuración > Notificaciones.`}
        </Section>

        <Section title="7. Retención de datos" textColor={appColors.text} titleColor={appColors.text}>
          {`Conservamos tus datos mientras tu cuenta esté activa. Si eliminás tu cuenta, borraremos tus datos personales dentro de los 30 días siguientes, excepto los que debamos conservar por obligaciones legales.`}
        </Section>

        <Section title="8. Cambios en esta política" textColor={appColors.text} titleColor={appColors.text}>
          {`Podemos actualizar esta política periódicamente. Te notificaremos de cambios significativos mediante una notificación dentro de la app o por correo electrónico. Te recomendamos revisar esta política cada vez que usés nuestra app.`}
        </Section>

        <Section title="9. Contacto" textColor={appColors.text} titleColor={appColors.text}>
          {`Si tenés preguntas sobre esta política de privacidad, podés contactarnos en:\n\nShinraCode\nEmail: shinracode11@gmail.com\nAplicación: ShinraFixture 2026`}
        </Section>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: appColors.textSecondary }]}>
            © 2026 ShinraCode — Yamil D. Rueda. Todos los derechos reservados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 36, alignItems: 'flex-start' },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },
  content: {
    padding: spacing.base,
    paddingBottom: spacing.xxxl,
  },
  lastUpdated: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    marginBottom: spacing.sm,
  },
  onlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    marginBottom: spacing.base,
  },
  onlineBannerText: {
    flex: 1, fontSize: 13, fontFamily: typography.fontFamily.medium,
  },
  intro: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    lineHeight: 22,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    textAlign: 'center',
  },
});
